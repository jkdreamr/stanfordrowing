import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import AppShell from './components/AppShell';

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Cardinal Row',
  description: 'Stanford Rowing — summer training, kept honest.',
  applicationName: 'Cardinal Row',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cardinal Row',
  },
  openGraph: {
    title: 'Cardinal Row',
    description: 'Stanford Rowing — summer training, kept honest.',
    siteName: 'Cardinal Row',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cardinal Row',
    description: 'Stanford Rowing — summer training, kept honest.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // App-like feel: no pinch/double-tap zoom on the UI. Media that should zoom
  // (proof photos) opens in its own tab, where zoom works normally.
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0d1110',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${mono.variable} h-full`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,0&display=block"
        />
      </head>
      <body className="h-full bg-bone text-charcoal antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
