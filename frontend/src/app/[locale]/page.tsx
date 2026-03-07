import { redirect } from 'next/navigation';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // Ana sayfaya (localhost:3000/[locale]) girildiğinde otomatik olarak /[locale]/login sayfasına yönlendir.
  redirect(`/${locale}/login`);
}
