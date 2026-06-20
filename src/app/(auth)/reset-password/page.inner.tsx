'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/apiClient';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const { ok, data } = await api.post('/api/auth/reset-password', { email, code, newPassword });
    setIsLoading(false);

    if (!ok) {
      setError(data.error);
      return;
    }
    router.push('/login');
  }

  return (
    <AuthShell title="Set a new password" subtitle="Enter the code we emailed you">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          label="Reset code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          required
          inputMode="numeric"
        />
        <Input
          label="New password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" isLoading={isLoading} className="w-full">
          Reset password
        </Button>
      </form>
    </AuthShell>
  );
}

export default ResetPasswordForm;
