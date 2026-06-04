/**
 * Merkezi API URL Yönetimi
 * 
 * Next.js'de NEXT_PUBLIC_* değişkenleri BUILD-TIME'da inline edilir.
 * Bu dosya hem SSR hem CSR için tutarlı bir API URL sağlar.
 * 
 * Kurallar:
 * 1. .env'de NEXT_PUBLIC_API_URL tanımlıysa → her zaman o kullanılır
 * 2. Tanımlı değilse ve geliştirme ortamıysa → localhost:4050 fallback
 */

export function getApiUrl(): string {
  // 1. Env değişkeni her zaman önceliklidir (build-time'da inline edilir)
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  // 2. Fallback: Sadece envUrl boşsa ve tarayıcıdaysak akıllı IP tespiti yap (Offline/Local ağ desteği)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || /^192\.168\./.test(hostname) || /^10\./.test(hostname)) {
      return `http://${hostname}:4050`;
    }
  }

  // 3. Hiçbiri yoksa varsayılan
  return 'http://localhost:4050';
}

export const API_URL = getApiUrl();
