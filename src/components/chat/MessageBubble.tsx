'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { Check, CheckCheck, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useFileUrl } from '@/hooks/useFileUrl';
import { api } from '@/lib/apiClient';
import type { MessageItem } from '@/types';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function AttachmentPreview({ file }: { file: any }) {
  const url = useFileUrl(file._id || file);
  const kind = file.kind;

  if (!url) return <div className="h-32 w-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />;

  if (kind === 'image' || kind === 'gif' || kind === 'sticker') {
    return <img src={url} alt={file.originalName} className="max-h-72 max-w-xs rounded-lg object-cover" />;
  }
  if (kind === 'video') {
    return <video src={url} controls className="max-h-72 max-w-xs rounded-lg" />;
  }
  if (kind === 'audio' || kind === 'voice') {
    return <audio src={url} controls className="w-56" />;
  }
  return <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-sm underline dark:bg-white/10">📄 {file.originalName}</a>;
}

export function MessageBubble({
  message,
  isOwn,
  onReply,
  showViews,
}: {
  message: MessageItem;
  isOwn: boolean;
  onReply: (m: MessageItem) => void;
  showViews?: boolean;
}) {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const sender = typeof message.senderId === 'object' ? message.senderId : null;

  async function react(emoji: string) {
    await api.post(`/api/chats/${message.chatId}/messages/${message._id}/reactions`, { emoji });
  }

  async function handleDelete() {
    await api.delete(`/api/chats/${message.chatId}/messages/${message._id}`);
  }

  if (message.isDeleted) {
    return (
      <div className={clsx('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm italic text-zinc-400 dark:bg-zinc-800">
          Message deleted
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx('group flex animate-message-in', isOwn ? 'justify-end' : 'justify-start')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={clsx('relative max-w-[75%] sm:max-w-[60%]')}>
        {showActions && (
          <div
            className={clsx(
              'absolute -top-9 z-10 flex gap-1 rounded-full border border-zinc-100 bg-white px-1.5 py-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-800',
              isOwn ? 'right-0' : 'left-0',
            )}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button key={emoji} onClick={() => react(emoji)} className="text-sm hover:scale-125 transition-transform">
                {emoji}
              </button>
            ))}
            <button onClick={() => onReply(message)} className="px-1 text-xs text-zinc-400">
              Reply
            </button>
            {isOwn && (
              <button onClick={handleDelete} className="px-1 text-xs text-red-400">
                Delete
              </button>
            )}
          </div>
        )}

        <div
          className={clsx(
            'px-3.5 py-2 text-sm shadow-sm',
            isOwn ? 'bubble-out bg-surface-bubbleOut dark:bg-surface-bubbleOutDark' : 'bubble-in bg-surface-bubbleIn dark:bg-surface-bubbleInDark border border-zinc-100 dark:border-zinc-700',
          )}
        >
          {!isOwn && sender && (
            <div className="mb-0.5 text-xs font-semibold text-brand-600">{sender.displayName}</div>
          )}

          {message.fileIds?.length > 0 && (
            <div className="mb-1.5 flex flex-col gap-1.5">
              {message.fileIds.map((f: any, i: number) => <AttachmentPreview key={f._id || i} file={f} />)}
            </div>
          )}

          {message.text && <div className="whitespace-pre-wrap break-words">{message.text}</div>}

          <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-zinc-400">
            {message.isEdited && <span>edited</span>}
            <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
            {showViews ? (
              <span>👁 {message.readBy.length}</span>
            ) : (
              isOwn &&
              (message.readBy.length > 1 ? (
                <CheckCheck size={14} className="text-brand-500" />
              ) : (
                <Check size={14} />
              ))
            )}
          </div>
        </div>

        {message.reactions.length > 0 && (
          <div className={clsx('mt-1 flex flex-wrap gap-1', isOwn ? 'justify-end' : 'justify-start')}>
            {Object.entries(
              message.reactions.reduce<Record<string, number>>((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {}),
            ).map(([emoji, count]) => (
              <span
                key={emoji}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
              >
                {emoji} {count > 1 && count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
