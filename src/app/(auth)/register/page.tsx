'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/apiClient';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', username: '', displayName: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { ok, data } = await api.post('/api/auth/register', form);
    setIsLoading(false);

    if (!ok) {
      setError(data.issues?.fieldErrors ? Object.values(data.issues.fieldErrors).flat()[0] as string : data.error);
      return;
    }

    router.push(`/verify?email=${encodeURIComponent(form.email)}`);
  }

  return (
    <AuthShell title="Create your account" subtitle="It only takes a minute">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Display name" value={form.displayName} onChange={update('displayName')} required maxLength={64} />
        <Input
          label="Username"
          value={form.username}
          onChange={update('username')}
          placeholder="username"
          required
          minLength={5}
          maxLength={32}
        />
        <Input label="Email" type="email" value={form.email} onChange={update('email')} required autoComplete="email" />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={update('password')}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="-mt-1 text-xs text-zinc-400">
          At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
        </p>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" isLoading={isLoading} className="mt-1 w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
