'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';

const cache = new Map<string, { url: string; expiresAt: number }>();

/** Resolves a File document id to a signed download URL, with a small in-memory cache. */
export function useFileUrl(fileId?: string) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId) return;
    const cached = cache.get(fileId);
    if (cached && cached.expiresAt > Date.now()) {
      setUrl(cached.url);
      return;
    }

    api.get<{ url: string; expiresAt: string }>(`/api/files/${fileId}`).then(({ ok, data }) => {
      if (ok && data.url) {
        cache.set(fileId, { url: data.url, expiresAt: new Date(data.expiresAt).getTime() });
        setUrl(data.url);
      }
    });
  }, [fileId]);

  return url;
}
