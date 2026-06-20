'use client';

import { useFileUrl } from '@/hooks/useFileUrl';
import clsx from 'clsx';

interface AvatarProps {
  name: string;
  fileId?: string;
  size?: number;
  isOnline?: boolean;
}

const COLORS = ['#e17076', '#7bc862', '#65aadd', '#a695e7', '#ee7aae', '#6ec9cb', '#faa774'];

function colorFor(name: string) {
  const idx = name.charCodeAt(0) % COLORS.length;
  return COLORS[idx] || COLORS[0];
}

export function Avatar({ name, fileId, size = 44, isOnline }: AvatarProps) {
  const url = useFileUrl(fileId);
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full font-medium text-white"
          style={{ backgroundColor: colorFor(name), fontSize: size * 0.4 }}
        >
          {initials}
        </div>
      )}
      {isOnline !== undefined && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-surface-dark',
            isOnline ? 'bg-green-500' : 'bg-zinc-400',
          )}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
