'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Search } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { Avatar } from '@/components/ui/Avatar';

export function GlobalSearchPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ users: any[]; chats: any[]; messages: any[]; media: any[] }>({
    users: [],
    chats: [],
    messages: [],
    media: [],
  });

  useEffect(() => {
    if (!query.trim()) {
      setResults({ users: [], chats: [], messages: [], media: [] });
      return;
    }
    const timeout = setTimeout(async () => {
      const { ok, data } = await api.get(`/api/search?q=${encodeURIComponent(query)}`);
      if (ok) setResults(data);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="fixed inset-0 z-30 bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <Search size={18} className="text-zinc-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, chats, messages..."
          className="flex-1 bg-transparent text-sm outline-none"
        />
        <button onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <div className="scroll-thin h-[calc(100%-56px)] overflow-y-auto p-2">
        {results.users.length > 0 && (
          <section className="mb-3">
            <h3 className="px-2 py-1 text-xs font-semibold uppercase text-zinc-400">People</h3>
            {results.users.map((u) => (
              <button
                key={u._id}
                onClick={async () => {
                  const { ok, data } = await api.post('/api/chats', { type: 'direct', participantIds: [u._id] });
                  if (ok) {
                    onClose();
                    router.push(`/chats/${data.chat.id}`);
                  }
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <Avatar name={u.displayName} fileId={u.avatarFileId} size={36} />
                <div>
                  <div className="text-sm font-medium">{u.displayName}</div>
                  <div className="text-xs text-zinc-400">@{u.username}</div>
                </div>
              </button>
            ))}
          </section>
        )}

        {results.chats.length > 0 && (
          <section className="mb-3">
            <h3 className="px-2 py-1 text-xs font-semibold uppercase text-zinc-400">Chats</h3>
            {results.chats.map((c) => (
              <button
                key={c._id}
                onClick={() => {
                  onClose();
                  router.push(`/chats/${c._id}`);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <Avatar name={c.name || 'Chat'} fileId={c.avatarFileId} size={36} />
                <div className="text-sm font-medium">{c.name}</div>
              </button>
            ))}
          </section>
        )}

        {results.messages.length > 0 && (
          <section className="mb-3">
            <h3 className="px-2 py-1 text-xs font-semibold uppercase text-zinc-400">Messages</h3>
            {results.messages.map((m) => (
              <button
                key={m._id}
                onClick={() => {
                  onClose();
                  router.push(`/chats/${m.chatId}`);
                }}
                className="block w-full truncate rounded-xl px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                {m.text}
              </button>
            ))}
          </section>
        )}

        {query && !results.users.length && !results.chats.length && !results.messages.length && (
          <p className="p-6 text-center text-sm text-zinc-400">No results for &ldquo;{query}&rdquo;</p>
        )}
      </div>
    </div>
  );
}
