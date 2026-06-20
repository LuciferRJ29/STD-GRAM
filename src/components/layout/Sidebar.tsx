'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SquarePen, Settings, LogOut } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useAuth } from '@/components/auth/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { ChatListItemRow } from '@/components/chat/ChatListItemRow';
import { NewChatModal } from '@/components/chat/NewChatModal';
import { GlobalSearchPanel } from '@/components/chat/GlobalSearchPanel';

export function Sidebar() {
  const chats = useChatStore((s) => s.chats);
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeChats = chats.filter((c) => !c.isArchived);

  return (
    <aside className="flex w-full flex-col border-r border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            <Avatar name={user?.displayName || ''} fileId={user?.avatarFileId} size={36} />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-12 z-20 w-48 rounded-xl border border-zinc-100 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push('/chats/settings');
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <Settings size={16} /> Settings
              </button>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <LogOut size={16} /> Log out
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex flex-1 items-center gap-2 rounded-full bg-zinc-100 px-3.5 py-2 text-sm text-zinc-400 dark:bg-zinc-800"
        >
          <Search size={16} />
          Search
        </button>

        <button
          onClick={() => setIsNewChatOpen(true)}
          aria-label="New chat"
          className="rounded-full p-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-zinc-800"
        >
          <SquarePen size={20} />
        </button>
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto">
        {activeChats.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-400">
            No chats yet. Tap the compose icon to start one.
          </div>
        ) : (
          activeChats.map((chat) => <ChatListItemRow key={chat.id} chat={chat} />)
        )}
      </div>

      {isNewChatOpen && <NewChatModal onClose={() => setIsNewChatOpen(false)} />}
      {isSearchOpen && <GlobalSearchPanel onClose={() => setIsSearchOpen(false)} />}
    </aside>
  );
}
