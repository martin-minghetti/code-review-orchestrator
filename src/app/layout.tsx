import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeToggle } from '@/components/theme-toggle';
import { ThemeScript } from '@/components/theme-script';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Code Review Orchestrator',
  description: '4 AI agents review your pull request in parallel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased bg-background text-foreground">
        <header className="flex items-center justify-end px-4 py-3">
          <ThemeToggle />
        </header>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
