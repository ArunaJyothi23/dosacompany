import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from 'next/font/google';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'WATAN — Afghan & Pakistani Cuisine | Order Online',
  description: 'Order authentic halal Afghan & Pakistani food online for collection or delivery from WATAN Southall, Ilford, Tooting and Wood Green.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
  openGraph: {
    title: 'WATAN — Order Online',
    description: 'Choose your WATAN restaurant, browse the full menu and pay securely online for collection or delivery.',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://watanrestaurant.co.uk',
    siteName: 'WATAN',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${ibmPlexMono.variable}`}>
      <body className={plusJakartaSans.className}>
        {children}
        <Toaster position="bottom-right" richColors />
</body>
    </html>
  );
}