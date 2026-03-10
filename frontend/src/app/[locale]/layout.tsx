import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AuthProvider } from './AuthContext';
import { ThemeProvider as NextThemeProvider } from 'next-themes';
import '../globals.css';

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  console.log(`[RootLayout] Current locale:`, locale);

  // Ensure that the incoming `locale` is valid
  const locales = ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'];
  if (!locales.includes(locale)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages({ locale });

  const isRTL = locale === 'ar';

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://site-assets.fontawesome.com/releases/v6.5.1/css/all.css" />
      </head>
      <body className="antialiased text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-x-hidden" suppressHydrationWarning={true}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <NextThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <AuthProvider locale={locale}>{children}</AuthProvider>
          </NextThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
