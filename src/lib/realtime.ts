/**
 * Vercel has no persistent-process WebSocket support, so realtime here is
 * built on Server-Sent Events backed by MongoDB Atlas change streams
 * (Atlas clusters are always replica sets, which change streams require).
 *
 * Each browser tab opens one SSE connection (GET /api/events). The route
 * handler opens a change stream scoped to that user's chats and pipes
 * matching events down as SSE frames for the lifetime of the connection.
 *
 * Trade-off vs. a dedicated Socket.io server: slightly higher latency
 * (typically sub-second) and the connection is capped by the platform's
 * function execution limit, so the client must reconnect automatically
 * (handled in the useRealtime hook) - acceptable for a 100-500 user app
 * optimizing for "Vercel-only" deployment.
 */
import { connectDB } from './db';
import { Chat } from '@/models';
import mongoose from 'mongoose';

export type RealtimeEvent =
  | { type: 'message:new'; chatId: string; messageId: string }
  | { type: 'message:edit'; chatId: string; messageId: string }
  | { type: 'message:delete'; chatId: string; messageId: string }
  | { type: 'message:reaction'; chatId: string; messageId: string }
  | { type: 'chat:read'; chatId: string; userId: string; messageId: string }
  | { type: 'typing'; chatId: string; userId: string; isTyping: boolean }
  | { type: 'presence'; userId: string; isOnline: boolean; lastSeenAt: string }
  | { type: 'notification:new'; notificationId: string }
  | { type: 'chat:upsert'; chatId: string };

/** Returns the chat IDs a user currently belongs to, for scoping the change stream. */
export async function getUserChatIds(userId: string): Promise<string[]> {
  await connectDB();
  const chats = await Chat.find({ 'members.userId': userId }, { _id: 1 }).lean();
  return chats.map((c) => String(c._id));
}

/**
 * Opens a MongoDB change stream over `messages` and `notifications`
 * filtered to the given chat ids / user id, and invokes `onEvent` for
 * each relevant change. Returns a close() function.
 */
export function watchRealtimeEvents(
  chatIds: string[],
  userId: string,
  onEvent: (evt: RealtimeEvent) => void,
): () => void {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection not ready');

  const chatObjectIds = chatIds.map((id) => new mongoose.Types.ObjectId(id));

  const messageStream = db.collection('messages').watch(
    [
      {
        $match: {
          'fullDocument.chatId': { $in: chatObjectIds },
        },
      },
    ],
    { fullDocument: 'updateLookup' },
  );

  const notificationStream = db.collection('notifications').watch(
    [
      {
        $match: {
          'fullDocument.userId': new mongoose.Types.ObjectId(userId),
          operationType: 'insert',
        },
      },
    ],
    { fullDocument: 'updateLookup' },
  );

  messageStream.on('change', (change: any) => {
    const doc = change.fullDocument;
    if (!doc) return;
    const chatId = String(doc.chatId);

    if (change.operationType === 'insert') {
      onEvent({ type: 'message:new', chatId, messageId: String(doc._id) });
    } else if (change.operationType === 'update') {
      if (doc.isDeleted) {
        onEvent({ type: 'message:delete', chatId, messageId: String(doc._id) });
      } else if (doc.isEdited) {
        onEvent({ type: 'message:edit', chatId, messageId: String(doc._id) });
      } else {
        onEvent({ type: 'message:reaction', chatId, messageId: String(doc._id) });
      }
    }
  });

  notificationStream.on('change', (change: any) => {
    const doc = change.fullDocument;
    if (!doc) return;
    onEvent({ type: 'notification:new', notificationId: String(doc._id) });
  });

  messageStream.on('error', () => undefined);
  notificationStream.on('error', () => undefined);

  return () => {
    messageStream.close().catch(() => undefined);
    notificationStream.close().catch(() => undefined);
  };
}

/**
 * Lightweight ephemeral signals (typing indicators, presence) don't need
 * durable storage, so they're broadcast through Redis pub/sub when
 * available, with an in-memory fallback for single-instance/dev use.
 */
import Redis from 'ioredis';

let pub: Redis | null = null;
let sub: Redis | null = null;
const memoryListeners = new Set<(evt: RealtimeEvent) => void>();

function getRedisPair() {
  if (!process.env.REDIS_URL) return null;
  if (!pub) pub = new Redis(process.env.REDIS_URL);
  if (!sub) sub = new Redis(process.env.REDIS_URL);
  return { pub, sub };
}

const EPHEMERAL_CHANNEL = 'realtime:ephemeral';

export async function publishEphemeralEvent(evt: RealtimeEvent): Promise<void> {
  const redis = getRedisPair();
  if (redis) {
    await redis.pub.publish(EPHEMERAL_CHANNEL, JSON.stringify(evt));
  } else {
    for (const listener of memoryListeners) listener(evt);
  }
}

export function subscribeEphemeralEvents(onEvent: (evt: RealtimeEvent) => void): () => void {
  const redis = getRedisPair();
  if (redis) {
    const handler = (_channel: string, message: string) => {
      try {
        onEvent(JSON.parse(message) as RealtimeEvent);
      } catch {
        /* ignore malformed payloads */
      }
    };
    redis.sub.subscribe(EPHEMERAL_CHANNEL).catch(() => undefined);
    redis.sub.on('message', handler);
    return () => {
      redis.sub.off('message', handler);
    };
  }

  memoryListeners.add(onEvent);
  return () => memoryListeners.delete(onEvent);
}
