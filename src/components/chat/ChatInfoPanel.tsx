'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Crown, Shield, UserMinus, Link as LinkIcon, Copy } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/components/auth/AuthProvider';

const ROLE_ICON: Record<string, any> = { owner: Crown, admin: Shield, moderator: Shield };

export function ChatInfoPanel({ chat, onClose, onChanged }: { chat: any; onClose: () => void; onChanged: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const isGroupLike = chat.type === 'group' || chat.type === 'channel';
  const myRole = chat.myRole;
  const isAdmin = myRole === 'owner' || myRole === 'admin';
  const title = chat.name;

  async function generateInvite() {
    setIsWorking(true);
    const { ok, data } = await api.post(`/api/groups/${chat.id}/invite`);
    setIsWorking(false);
    if (ok) setInviteUrl(data.inviteUrl);
  }

  async function removeMember(userId: string) {
    await api.delete(`/api/groups/${chat.id}/members`, { userId });
    onChanged();
  }

  async function changeRole(userId: string, role: string) {
    await api.patch(`/api/groups/${chat.id}/members`, { userId, role });
    onChanged();
  }

  async function leaveChat() {
    setIsWorking(true);
    await api.delete(`/api/chats/${chat.id}`);
    setIsWorking(false);
    onClose();
    router.push('/chats');
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="scroll-thin h-full w-full max-w-sm overflow-y-auto bg-white p-5 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{chat.type === 'channel' ? 'Channel info' : chat.type === 'group' ? 'Group info' : 'Chat info'}</h2>
          <button onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Avatar name={title || 'Chat'} fileId={chat.avatarFileId} size={88} />
          <h3 className="text-xl font-medium">{title}</h3>
          {chat.description && <p className="text-sm text-zinc-500">{chat.description}</p>}
          <p className="text-sm text-zinc-400">
            {chat.type === 'channel'
              ? `${chat.members.length} subscriber${chat.members.length === 1 ? '' : 's'}`
              : `${chat.members.length} member${chat.members.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {isAdmin && isGroupLike && (
          <div className="mb-6 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <LinkIcon size={16} /> Invite link
            </div>
            {inviteUrl || chat.inviteCode ? (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-800">
                <span className="truncate text-brand-600">
                  {inviteUrl || `${window.location.origin}/join/${chat.inviteCode}`}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(inviteUrl || `${window.location.origin}/join/${chat.inviteCode}`)}
                  aria-label="Copy invite link"
                >
                  <Copy size={14} />
                </button>
              </div>
            ) : (
              <Button variant="secondary" isLoading={isWorking} onClick={generateInvite} className="w-full">
                Generate invite link
              </Button>
            )}
          </div>
        )}

        {isGroupLike && (
          <div className="mb-6">
            <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-400">
              {chat.type === 'channel' ? 'Subscribers' : 'Members'}
            </h4>
            <div className="flex flex-col gap-1">
              {chat.members.map((m: any) => {
                const RoleIcon = ROLE_ICON[m.role];
                const isMe = m.userId === user?.id;
                return (
                  <div key={m.userId} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <Avatar name={m.displayName} fileId={m.avatarFileId} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        {m.displayName} {isMe && <span className="text-xs text-zinc-400">(you)</span>}
                      </div>
                      <div className="text-xs text-zinc-400">@{m.username}</div>
                    </div>
                    {RoleIcon && <RoleIcon size={14} className="text-brand-500" />}
                    {isAdmin && !isMe && m.role !== 'owner' && (
                      <div className="flex items-center gap-1">
                        {myRole === 'owner' && m.role === 'member' && (
                          <button
                            onClick={() => changeRole(m.userId, 'admin')}
                            className="text-xs text-brand-600 hover:underline"
                          >
                            Make admin
                          </button>
                        )}
                        <button onClick={() => removeMember(m.userId)} aria-label="Remove member">
                          <UserMinus size={14} className="text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Button variant="danger" onClick={leaveChat} isLoading={isWorking} className="w-full">
          {chat.type === 'channel' ? 'Leave channel' : chat.type === 'group' ? 'Leave group' : 'Delete chat'}
        </Button>
      </div>
    </div>
  );
}
