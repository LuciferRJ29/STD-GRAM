'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { UserSummary } from '@/types';

export function NewChatModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [selected, setSelected] = useState<UserSummary[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { ok, data } = await api.get(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (ok) setResults(data.users);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  async function startDirectChat(userId: string) {
    setIsCreating(true);
    const { ok, data } = await api.post('/api/chats', { type: 'direct', participantIds: [userId] });
    setIsCreating(false);
    if (ok) {
      onClose();
      router.push(`/chats/${data.chat.id}`);
    }
  }

  async function createGroup() {
    if (!groupName.trim() || selected.length === 0) return;
    setIsCreating(true);
    const { ok, data } = await api.post('/api/chats', {
      type: 'group',
      name: groupName,
      participantIds: selected.map((u) => u.id),
    });
    setIsCreating(false);
    if (ok) {
      onClose();
      router.push(`/chats/${data.chat.id}`);
    }
  }

  function toggleSelected(user: UserSummary) {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user],
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl bg-white p-4 dark:bg-zinc-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setMode('direct')}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${mode === 'direct' ? 'bg-brand-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}
            >
              New chat
            </button>
            <button
              onClick={() => setMode('group')}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${mode === 'group' ? 'bg-brand-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}
            >
              New group
            </button>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {mode === 'group' && (
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="mb-3"
          />
        )}

        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by username or name" autoFocus />

        {mode === 'group' && selected.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selected.map((u) => (
              <span
                key={u.id}
                onClick={() => toggleSelected(u)}
                className="cursor-pointer rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-700 dark:bg-zinc-800 dark:text-brand-300"
              >
                {u.displayName} ✕
              </span>
            ))}
          </div>
        )}

        <div className="scroll-thin mt-3 max-h-72 flex-1 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => (mode === 'direct' ? startDirectChat(u.id) : toggleSelected(u))}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <Avatar name={u.displayName} fileId={u.avatarFileId} size={36} />
              <div>
                <div className="text-sm font-medium">{u.displayName}</div>
                <div className="text-xs text-zinc-400">@{u.username}</div>
              </div>
              {mode === 'group' && selected.some((s) => s.id === u.id) && (
                <span className="ml-auto text-brand-600">✓</span>
              )}
            </button>
          ))}
        </div>

        {mode === 'group' && (
          <Button onClick={createGroup} isLoading={isCreating} className="mt-3 w-full">
            Create group
          </Button>
        )}
      </div>
    </div>
  );
}
