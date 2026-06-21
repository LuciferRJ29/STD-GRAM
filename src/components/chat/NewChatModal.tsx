'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { UserSummary } from '@/types';

type Mode = 'direct' | 'group' | 'channel';

export function NewChatModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [mode, setMode] = useState<Mode>('direct');
  const [selected, setSelected] = useState<UserSummary[]>([]);
  const [groupName, setGroupName] = useState('');
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [isChannelPublic, setIsChannelPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (mode === 'channel' || !query.trim()) {
      if (mode === 'channel') setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { ok, data } = await api.get(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (ok) setResults(data.users);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, mode]);

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
    if (!groupName.trim()) return;
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

  async function createChannel() {
    if (!channelName.trim()) return;
    setIsCreating(true);
    const { ok, data } = await api.post('/api/chats', {
      type: 'channel',
      name: channelName,
      description: channelDescription || undefined,
      isPublic: isChannelPublic,
      participantIds: [],
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

  const TABS: { key: Mode; label: string }[] = [
    { key: 'direct', label: 'New chat' },
    { key: 'group', label: 'New group' },
    { key: 'channel', label: 'New channel' },
  ];

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-white p-4 dark:bg-zinc-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setMode(t.key)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${mode === t.key ? 'bg-brand-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {mode === 'channel' ? (
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
            <Input value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="Channel name" autoFocus />
            <Input
              value={channelDescription}
              onChange={(e) => setChannelDescription(e.target.value)}
              placeholder="Description (optional)"
            />
            <div className="flex items-center justify-between rounded-xl border border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
              <div>
                <div className="text-sm font-medium">Public channel</div>
                <div className="text-xs text-zinc-400">Anyone can find and subscribe</div>
              </div>
              <button
                onClick={() => setIsChannelPublic((v) => !v)}
                className={`h-6 w-11 rounded-full transition-colors ${isChannelPublic ? 'bg-brand-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
              >
                <span
                  className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${isChannelPublic ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              You can invite subscribers after creating the channel. Only you (and admins you add) can post.
            </p>
            <Button onClick={createChannel} isLoading={isCreating} className="mt-1 w-full">
              Create channel
            </Button>
          </div>
        ) : (
          <>
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
                Create group {selected.length === 0 && '(just you for now)'}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
