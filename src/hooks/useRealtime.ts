'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { api } from '@/lib/apiClient';

type ServerEvent =
  | { type: 'message:new'; chatId: string; messageId: string }
  | { type: 'message:edit'; chatId: string; messageId: string }
  | { type: 'message:delete'; chatId: string; messageId: string }
  | { type: 'message:reaction'; chatId: string; messageId: string }
  | { type: 'chat:read'; chatId: string; userId: string; messageId: string }
  | { type: 'typing'; chatId: string; userId: string; isTyping: boolean }
  | { type: 'presence'; userId: string; isOnline: boolean; lastSeenAt: string }
  | { type: 'notification:new'; notificationId: string }
  | { type: 'chat:upsert'; chatId: string };

/**
 * Maintains a single SSE connection for the lifetime of the app shell and
 * reconnects automatically (with backoff) if the connection drops -
 * which happens periodically since the underlying Vercel function has a
 * max execution duration. This is the realtime backbone described in the
 * architecture notes (MongoDB change streams + Redis ephemeral events).
 */
export function useRealtime(onMessageEvent: (evt: ServerEvent) => void) {
  const reconnectAttempt = useRef(0);
  const sourceRef = useRef<EventSource | null>(null);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const setTyping = useChatStore((s) => s.setTyping);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const source = new EventSource('/api/events');
      sourceRef.current = source;

      source.onopen = () => {
        reconnectAttempt.current = 0;
      };

      source.onmessage = async (e) => {
        if (!e.data) return;
        const evt = JSON.parse(e.data) as ServerEvent;

        if (evt.type === 'message:new') {
          const res = await api.get(`/api/chats/${evt.chatId}/messages?limit=1`);
          const message = res.data?.messages?.[res.data.messages.length - 1];
          if (message) addMessage(evt.chatId, message);
        } else if (evt.type === 'typing') {
          setTyping(evt.chatId, evt.userId, evt.isTyping);
        } else if (evt.type === 'message:delete') {
          removeMessage(evt.chatId, evt.messageId);
        }

        onMessageEvent(evt);
      };

      source.onerror = () => {
        source.close();
        if (cancelled) return;
        const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 15_000);
        reconnectAttempt.current += 1;
        setTimeout(connect, delay);
      };
    }

    connect();
    return () => {
      cancelled = true;
      sourceRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
