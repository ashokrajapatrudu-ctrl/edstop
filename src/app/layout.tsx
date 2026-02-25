import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/index.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import InactivityManager from '@/components/ui/InactivityManager';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'EdStop - IIT Kharagpur Campus Commerce',
  description: 'The ultimate campus commerce platform for IIT Kharagpur students. Order food, shop essentials, manage your EdCoins wallet, and get AI assistance.',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' }
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <InactivityManager />
            {children}
          </ToastProvider>
        </AuthProvider>
</body>
    </html>
  );
}
