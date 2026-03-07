import { redirect } from 'next/navigation';

export default function Home() {
  // Ana sayfaya (localhost:3000) girildiğinde otomatik olarak /login sayfasına yönlendir.
  redirect('/login');
}
