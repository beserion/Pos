'use client';
import { AuthProvider } from './AuthContext';
import { ThemeProvider as NextThemeProvider } from 'next-themes';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://site-assets.fontawesome.com/releases/v6.5.1/css/all.css" />
      </head>
      <body className="antialiased text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-x-hidden" suppressHydrationWarning={true}>
        <NextThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>{children}</AuthProvider>
        </NextThemeProvider>
      </body>
    </html>
  );
}
