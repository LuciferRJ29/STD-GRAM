import { getAuthContext } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/models';
import { getUserChatIds, watchRealtimeEvents, subscribeEphemeralEvents, type RealtimeEvent } from '@/lib/realtime';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // seconds - relies on the Vercel plan's function timeout; client auto-reconnects on close

/**
 * One persistent SSE connection per browser tab. Streams durable events
 * (new/edited/deleted messages, reactions, notifications) from a MongoDB
 * change stream, plus ephemeral events (typing, presence) from the
 * Redis/in-memory pub-sub bus in lib/realtime.ts.
 *
 * The connection naturally closes when the serverless function's max
 * duration is hit; the client's useRealtime hook reconnects automatically,
 * so this is functionally "realtime" without a dedicated WebSocket server.
 */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return new Response('Unauthorized', { status: 401 });
  }

  await connectDB();
  await User.updateOne({ _id: ctx.user._id }, { isOnline: true, lastSeenAt: new Date() });

  const userId = String(ctx.user._id);
  const chatIds = await getUserChatIds(userId);

  const encoder = new TextEncoder();
  let closed = false;
  let closeChangeStream: (() => void) | null = null;
  let unsubscribeEphemeral: (() => void) | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: RealtimeEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Tell the client which chats are in scope so it can react to chat:upsert too.
      send({ type: 'chat:upsert', chatId: chatIds[0] || '' });

      try {
        closeChangeStream = chatIds.length ? watchRealtimeEvents(chatIds, userId, send) : null;
      } catch {
        // Change streams require a replica set; if unavailable, the client
        // falls back to its periodic poll (handled in useRealtime).
      }

      unsubscribeEphemeral = subscribeEphemeralEvents((evt) => {
        if ('chatId' in evt && chatIds.includes((evt as any).chatId)) send(evt);
        if (evt.type === 'presence') send(evt);
      });

      heartbeatInterval = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          closed = true;
        }
      }, 25_000);
    },
    cancel() {
      closed = true;
      closeChangeStream?.();
      unsubscribeEphemeral?.();
      if (heartbeatInterval) clearInterval(heartbeatInterval);

      // Best-effort presence update; a stale "online" flag self-corrects
      // next time getUserChatIds-based reconnection happens or via the
      // lastSeenAt-based UI fallback ("last seen recently").
      connectDB()
        .then(() => User.updateOne({ _id: userId }, { isOnline: false, lastSeenAt: new Date() }))
        .catch(() => undefined);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
