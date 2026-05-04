import type { Metadata } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'UniQueue',
  description: 'Efficient, real-time university queueing system for all departments.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-[#F4F4F7]">
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
