import { create } from 'zustand';
import type { ChatListItem, MessageItem } from '@/types';

interface ChatState {
  chats: ChatListItem[];
  activeChatId: string | null;
  messagesByChat: Record<string, MessageItem[]>;
  typingByChat: Record<string, Set<string>>;

  setChats: (chats: ChatListItem[]) => void;
  upsertChat: (chat: ChatListItem) => void;
  setActiveChatId: (id: string | null) => void;
  setMessages: (chatId: string, messages: MessageItem[]) => void;
  prependMessages: (chatId: string, messages: MessageItem[]) => void;
  addMessage: (chatId: string, message: MessageItem) => void;
  updateMessage: (chatId: string, messageId: string, patch: Partial<MessageItem>) => void;
  removeMessage: (chatId: string, messageId: string) => void;
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  messagesByChat: {},
  typingByChat: {},

  setChats: (chats) => set({ chats }),
  upsertChat: (chat) =>
    set((state) => {
      const idx = state.chats.findIndex((c) => c.id === chat.id);
      const next = [...state.chats];
      if (idx >= 0) next[idx] = { ...next[idx], ...chat };
      else next.unshift(chat);
      next.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
      return { chats: next };
    }),
  setActiveChatId: (id) => set({ activeChatId: id }),

  setMessages: (chatId, messages) =>
    set((state) => ({ messagesByChat: { ...state.messagesByChat, [chatId]: messages } })),

  prependMessages: (chatId, messages) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: [...messages, ...(state.messagesByChat[chatId] || [])],
      },
    })),

  addMessage: (chatId, message) =>
    set((state) => {
      const existing = state.messagesByChat[chatId] || [];
      if (existing.some((m) => m._id === message._id)) return state;
      return { messagesByChat: { ...state.messagesByChat, [chatId]: [...existing, message] } };
    }),

  updateMessage: (chatId, messageId, patch) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: (state.messagesByChat[chatId] || []).map((m) => (m._id === messageId ? { ...m, ...patch } : m)),
      },
    })),

  removeMessage: (chatId, messageId) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: (state.messagesByChat[chatId] || []).map((m) =>
          m._id === messageId ? { ...m, isDeleted: true, text: undefined } : m,
        ),
      },
    })),

  setTyping: (chatId, userId, isTyping) =>
    set((state) => {
      const set_ = new Set(state.typingByChat[chatId] || []);
      if (isTyping) set_.add(userId);
      else set_.delete(userId);
      return { typingByChat: { ...state.typingByChat, [chatId]: set_ } };
    }),
}));
