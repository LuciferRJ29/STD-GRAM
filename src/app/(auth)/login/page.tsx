'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/components/auth/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { ok, status, data } = await api.post('/api/auth/login', {
      identifier,
      password,
      rememberMe,
      twoFactorCode: needsTwoFactor ? twoFactorCode : undefined,
    });

    setIsLoading(false);

    if (!ok) {
      if (data.code === 'TWO_FACTOR_REQUIRED') {
        setNeedsTwoFactor(true);
        setError(twoFactorCode ? 'Invalid two-factor code' : null);
        return;
      }
      if (data.code === 'EMAIL_NOT_VERIFIED') {
        router.push(`/verify?email=${encodeURIComponent(data.email)}`);
        return;
      }
      setError(status === 429 ? data.error : data.error || 'Something went wrong');
      return;
    }

    await refresh();
    router.push('/chats');
  }

  return (
    <AuthShell title="Sign in" subtitle="Use your email or username">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!needsTwoFactor ? (
          <>
            <Input
              label="Email or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="font-medium text-brand-600 hover:underline">
                Forgot password?
              </Link>
            </div>
          </>
        ) : (
          <Input
            label="Two-factor code"
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
            placeholder="6-digit code or backup code"
            autoFocus
            required
          />
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" isLoading={isLoading} className="mt-1 w-full">
          {needsTwoFactor ? 'Verify and sign in' : 'Sign in'}
        </Button>
      </form>

      {!needsTwoFactor && (
        <p className="mt-6 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Sign up
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
