'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';

export default function ChatsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasActiveChat = pathname !== '/chats';

  useGlobalRealtime();

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-surface-dark">
      <div className={hasActiveChat ? 'hidden md:flex' : 'flex'} style={{ width: '100%', maxWidth: 420 }}>
        <Sidebar />
      </div>
      <div className={hasActiveChat ? 'flex flex-1' : 'hidden md:flex md:flex-1'}>{children}</div>
    </div>
  );
}
