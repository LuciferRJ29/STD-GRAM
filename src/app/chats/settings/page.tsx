'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Smartphone, Lock, User } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { api } from '@/lib/apiClient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

type Tab = 'profile' | 'privacy' | 'sessions' | 'security';

export default function SettingsPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [sessions, setSessions] = useState<any[]>([]);
  const [privacy, setPrivacy] = useState<any>(null);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ qrCodeDataUrl: string; secret: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  useEffect(() => {
    if (tab === 'sessions') {
      api.get('/api/auth/sessions').then(({ ok, data }) => ok && setSessions(data.sessions));
    }
    if (tab === 'privacy') {
      api.get('/api/users/me').then(({ ok, data }) => ok && setPrivacy(data.user.privacy));
    }
  }, [tab]);

  async function saveProfile() {
    setIsSaving(true);
    await api.patch('/api/users/me', { displayName, bio });
    await refresh();
    setIsSaving(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);

    const formData = new FormData();
    formData.append('file', file);
    const uploadRes = await api.upload('/api/upload', formData);

    if (uploadRes.ok) {
      await api.patch('/api/users/me', { avatarFileId: uploadRes.data.file._id });
      await refresh();
    }
    setIsUploadingAvatar(false);
    e.target.value = '';
  }

  async function savePrivacy(key: string, value: string) {
    setPrivacy((p: any) => ({ ...p, [key]: value }));
    await api.patch('/api/users/me/privacy', { [key]: value });
  }

  async function revokeSession(id: string) {
    await api.delete(`/api/auth/sessions/${id}`);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  async function start2FA() {
    const { ok, data } = await api.post('/api/auth/2fa/setup');
    if (ok) setTwoFactorSetup(data);
  }

  async function confirm2FA() {
    const { ok, data } = await api.post('/api/auth/2fa/verify', { token: twoFactorCode });
    if (ok) {
      setBackupCodes(data.backupCodes);
      setTwoFactorSetup(null);
      await refresh();
    }
  }

  const NAV: { key: Tab; label: string; icon: any }[] = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'privacy', label: 'Privacy', icon: Shield },
    { key: 'sessions', label: 'Devices', icon: Smartphone },
    { key: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <button onClick={() => router.push('/chats')} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-medium">Settings</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-44 border-r border-zinc-100 p-2 dark:border-zinc-800">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${tab === key ? 'bg-brand-50 text-brand-700 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        <div className="scroll-thin flex-1 overflow-y-auto p-6">
          {tab === 'profile' && (
            <div className="max-w-sm space-y-4">
              <div className="flex items-center gap-4">
                <Avatar name={user?.displayName || ''} fileId={user?.avatarFileId} size={72} />
                <div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <Button
                    variant="secondary"
                    isLoading={isUploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    Change photo
                  </Button>
                </div>
              </div>
              <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <Input label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
              <Button onClick={saveProfile} isLoading={isSaving}>
                Save changes
              </Button>
            </div>
          )}

          {tab === 'privacy' && privacy && (
            <div className="max-w-sm space-y-4">
              {(['lastSeen', 'profilePhoto', 'phoneNumber', 'forwarding', 'groupInvite'] as const).map((key) => (
                <div key={key}>
                  <label className="mb-1 block text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </label>
                  <select
                    value={privacy[key]}
                    onChange={(e) => savePrivacy(key, e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">Contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          {tab === 'sessions' && (
            <div className="max-w-md space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 p-3 text-sm dark:border-zinc-800"
                >
                  <div>
                    <div className="font-medium">
                      {s.device} {s.isCurrent && <span className="text-brand-600">(this device)</span>}
                    </div>
                    <div className="text-xs text-zinc-400">{s.ip}</div>
                  </div>
                  {!s.isCurrent && (
                    <Button variant="danger" onClick={() => revokeSession(s.id)}>
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'security' && (
            <div className="max-w-sm space-y-4">
              <h3 className="font-medium">Two-factor authentication</h3>
              {!twoFactorSetup && !backupCodes && (
                <Button onClick={start2FA} variant="secondary">
                  Enable 2FA
                </Button>
              )}
              {twoFactorSetup && (
                <div className="space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={twoFactorSetup.qrCodeDataUrl} alt="2FA QR code" className="h-40 w-40" />
                  <p className="text-xs text-zinc-400">Scan with your authenticator app, then enter the code below.</p>
                  <Input value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} maxLength={6} />
                  <Button onClick={confirm2FA}>Confirm</Button>
                </div>
              )}
              {backupCodes && (
                <div className="rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800">
                  <p className="mb-2 font-medium">Save these backup codes somewhere safe:</p>
                  <div className="grid grid-cols-2 gap-1 font-mono text-xs">
                    {backupCodes.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
