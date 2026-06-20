'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/apiClient';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    const { data } = await api.post('/api/auth/forgot-password', { email });
    setIsLoading(false);
    setMessage(data.message);
    setTimeout(() => router.push(`/reset-password?email=${encodeURIComponent(email)}`), 1200);
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a reset code">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        {message && <p className="text-sm text-green-600">{message}</p>}
        <Button type="submit" isLoading={isLoading} className="w-full">
          Send reset code
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
