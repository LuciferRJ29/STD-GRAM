import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ServiceWorkerRegister } from '@/components/layout/ServiceWorkerRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'STD GRAM',
  description: 'A fast, modern messaging app',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'STD GRAM' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1470cb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-surface dark:bg-surface-dark text-zinc-900 dark:text-zinc-100">
        <ServiceWorkerRegister />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
