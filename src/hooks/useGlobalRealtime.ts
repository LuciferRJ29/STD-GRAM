'use client';

import { useEffect } from 'react';
import { useRealtime } from './useRealtime';
import { useChatStore } from '@/store/chatStore';
import { api } from '@/lib/apiClient';

/** Mounted once at the chats layout level: keeps the chat list in sync with realtime events. */
export function useGlobalRealtime() {
  const setChats = useChatStore((s) => s.setChats);
  const upsertChat = useChatStore((s) => s.upsertChat);

  useEffect(() => {
    api.get('/api/chats').then(({ ok, data }) => {
      if (ok) setChats(data.chats);
    });
  }, [setChats]);

  useRealtime((evt) => {
    if (evt.type === 'message:new' || evt.type === 'chat:read') {
      api.get(`/api/chats/${evt.chatId}`).then(() => {
        // Refresh the single chat list item's preview/order by re-fetching the list.
        // Lightweight for 100-500 users; can be optimized to a single-chat patch later.
        api.get('/api/chats').then(({ ok, data }) => {
          if (ok) setChats(data.chats);
        });
      });
    }
  });
}
