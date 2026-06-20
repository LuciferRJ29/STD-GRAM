import type { ReactNode } from 'react';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4 dark:from-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white shadow-lg shadow-brand-600/30">
            T
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {children}
        </div>
      </div>
    </div>
  );
}
