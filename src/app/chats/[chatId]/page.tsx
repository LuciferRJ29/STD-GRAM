'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Video, MoreVertical, Megaphone } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChatStore } from '@/store/chatStore';
import { Avatar } from '@/components/ui/Avatar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { ChatInfoPanel } from '@/components/chat/ChatInfoPanel';
import type { MessageItem } from '@/types';

export default function ChatWindowPage() {
  const params = useParams<{ chatId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const chatId = params.chatId;

  const [chatInfo, setChatInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<MessageItem | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const messagesByChat = useChatStore((s) => s.messagesByChat);
  const setMessages = useChatStore((s) => s.setMessages);
  const typingByChat = useChatStore((s) => s.typingByChat);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = messagesByChat[chatId] || [];
  const typingUsers = Array.from(typingByChat[chatId] || []).filter((id) => id !== user?.id);

  async function loadChat() {
    setIsLoading(true);
    const [chatRes, messagesRes] = await Promise.all([
      api.get(`/api/chats/${chatId}`),
      api.get(`/api/chats/${chatId}/messages`),
    ]);
    if (chatRes.ok) setChatInfo(chatRes.data.chat);
    if (messagesRes.ok) setMessages(chatId, messagesRes.data.messages);
    setIsLoading(false);

    api.post(`/api/chats/${chatId}/read`);
  }

  useEffect(() => {
    loadChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (isLoading || !chatInfo) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const isGroupLike = chatInfo.type === 'group' || chatInfo.type === 'channel';
  const otherMember =
    chatInfo.type === 'direct' ? chatInfo.members.find((m: any) => m.userId !== user?.id) : null;
  const title = isGroupLike ? chatInfo.name : otherMember?.displayName;

  const canPost = chatInfo.type !== 'channel' || chatInfo.myRole === 'owner' || chatInfo.myRole === 'admin';

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
        <button onClick={() => router.push('/chats')} className="md:hidden" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <button onClick={() => setShowInfo(true)} className="flex flex-1 items-center gap-3 text-left">
          <Avatar name={title || 'Chat'} fileId={chatInfo.avatarFileId} size={38} isOnline={otherMember?.isOnline} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 truncate font-medium">
              {chatInfo.type === 'channel' && <Megaphone size={14} className="text-brand-500" />}
              {title}
            </div>
            <div className="truncate text-xs text-zinc-400">
              {typingUsers.length > 0
                ? 'typing...'
                : chatInfo.type === 'channel'
                  ? `${chatInfo.members.length} subscriber${chatInfo.members.length === 1 ? '' : 's'}`
                  : chatInfo.type === 'group'
                    ? `${chatInfo.members.length} members`
                    : otherMember?.isOnline
                      ? 'online'
                      : 'offline'}
            </div>
          </div>
        </button>
        {chatInfo.type === 'direct' && (
          <>
            <button className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Voice call">
              <Phone size={18} />
            </button>
            <button className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Video call">
              <Video size={18} />
            </button>
          </>
        )}
        <button
          onClick={() => setShowInfo(true)}
          className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="More"
        >
          <MoreVertical size={18} />
        </button>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto bg-[#e9eef3] px-4 py-4 dark:bg-zinc-900/40">
        <div className="flex flex-col gap-2">
          {messages.map((m) => (
            <MessageBubble
              key={m._id}
              message={m}
              isOwn={(typeof m.senderId === 'object' ? m.senderId.id : m.senderId) === user?.id}
              onReply={setReplyTo}
              showViews={chatInfo.type === 'channel'}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {canPost ? (
        <MessageComposer chatId={chatId} replyTo={replyTo} onClearReply={() => setReplyTo(null)} onSent={loadChat} />
      ) : (
        <div className="border-t border-zinc-100 px-4 py-3 text-center text-sm text-zinc-400 dark:border-zinc-800">
          Only channel admins can post here.
        </div>
      )}

      {showInfo && (
        <ChatInfoPanel chat={chatInfo} onClose={() => setShowInfo(false)} onChanged={loadChat} />
      )}
    </div>
  );
}
