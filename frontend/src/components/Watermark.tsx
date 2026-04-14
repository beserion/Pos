'use client';
import { usePathname } from 'next/navigation';

export default function Watermark() {
  const pathname = usePathname();
  
  // Login sayfasındaysak (herhangi bir dilde) logoyu gösterme
  const isLoginPage = pathname?.includes('/login');
  
  if (isLoginPage) return null;
  
  return (
    <img 
      src="/PosNetX3.png" 
      className="watermark-bg" 
      alt="Watermark" 
    />
  );
}
