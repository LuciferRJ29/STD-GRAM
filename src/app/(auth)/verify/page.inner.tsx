'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/apiClient';

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { ok, data } = await api.post('/api/auth/verify-otp', { email, code });
    setIsLoading(false);

    if (!ok) {
      setError(data.error);
      return;
    }

    router.push('/login');
  }

  async function handleResend() {
    setIsResending(true);
    setError(null);
    const { ok, data } = await api.post('/api/auth/resend-otp', { email, purpose: 'verify' });
    setIsResending(false);
    setMessage(ok ? data.message : data.error);
  }

  return (
    <AuthShell title="Verify your email" subtitle={`We sent a code to ${email || 'your email'}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Verification code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          required
          autoFocus
          inputMode="numeric"
          placeholder="000000"
        />

        {error && <p className="text-sm text-red-500">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}

        <Button type="submit" isLoading={isLoading} className="w-full">
          Verify
        </Button>
        <Button type="button" variant="ghost" isLoading={isResending} onClick={handleResend}>
          Resend code
        </Button>
      </form>
    </AuthShell>
  );
}

export default VerifyForm;
