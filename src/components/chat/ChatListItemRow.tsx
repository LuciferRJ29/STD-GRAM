'use client';

import { useRouter, useParams } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import clsx from 'clsx';
import { Avatar } from '@/components/ui/Avatar';
import type { ChatListItem } from '@/types';

export function ChatListItemRow({ chat }: { chat: ChatListItem }) {
  const router = useRouter();
  const params = useParams();
  const isActive = params?.chatId === chat.id;

  const title = chat.name || 'Unknown';
  const preview = chat.lastMessage
    ? chat.lastMessage.isDeleted
      ? 'Message deleted'
      : chat.lastMessage.text || '📎 Attachment'
    : 'No messages yet';

  return (
    <button
      onClick={() => router.push(`/chats/${chat.id}`)}
      className={clsx(
        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
        isActive ? 'bg-brand-50 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60',
      )}
    >
      <Avatar name={title} fileId={chat.avatarFileId} isOnline={chat.type === 'direct' ? chat.isOnline : undefined} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{title}</span>
          {chat.lastMessageAt && (
            <span className="shrink-0 text-xs text-zinc-400">
              {formatDistanceToNowStrict(new Date(chat.lastMessageAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-zinc-500 dark:text-zinc-400">{preview}</span>
          {chat.unreadCount > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-medium text-white">
              {chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
