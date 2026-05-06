/**
 * Merkezi API URL Yönetimi — Otomatik Yerel Yedek (Auto-Fallback) Sistemi
 * 
 * Mantık:
 * 1. İstekler önce .env'deki NEXT_PUBLIC_API_URL adresine gönderilir.
 * 2. Eğer istek ağ hatası alırsa (internet yok, sunucu kapalı vs.)
 *    otomatik olarak localhost:3050'ye yeniden denenir.
 * 3. Bu sayede internet varken uzak sunucu, yokken yerel backend kullanılır.
 */

import axios from 'axios';

// ─── URL Sabitleri ──────────────────────────────────────────────────────────────
const REMOTE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';
const LOCAL_URL = 'http://localhost:3050';

// Dışarıya aktarılan ana URL — her zaman uzak URL'i gösterir, fallback interceptor ile yönetilir
export const API_URL = REMOTE_URL;

// ─── Axios Interceptor: Ağ Hatası → Otomatik Localhost Denemesi ─────────────────
// Bu interceptor tüm axios isteklerini izler. Eğer bir istek ağ hatası alırsa
// (ERR_NAME_NOT_RESOLVED, timeout, connection refused vb.) aynı isteği
// localhost:3050 üzerinden tekrar dener.

const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  // Sunucudan HTTP yanıtı geldiyse (4xx, 5xx) bu ağ hatası DEĞİLDİR
  if (error.response) return false;
  // Gerçek ağ hataları: timeout, DNS çözümlenemedi, bağlantı reddedildi vs.
  return (
    error.code === 'ECONNABORTED' ||
    error.code === 'ERR_NETWORK' ||
    error.message === 'Network Error' ||
    error.message?.includes('timeout')
  );
};

// ─── Akıllı Mod Yönetimi (Circuit Breaker - Shared across tabs) ──────────────
const STORAGE_KEY = 'pos_remote_down';

const getRemoteDown = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

const setRemoteDown = (val: boolean) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, val.toString());
  // Custom event tetikle ki aynı sekme içindeki diğer kodlar da anında duysun
  window.dispatchEvent(new Event('storage_remote_down'));
};

let healthCheckInterval: any = null;

const startHealthCheck = () => {
  if (healthCheckInterval) return;
  
  console.warn("!!! [SİSTEM NOTU] Uzak sunucuya erişilemiyor. 'KESİNTİSİZ YEREL MOD' aktif edildi.");
  
  healthCheckInterval = setInterval(async () => {
    try {
      const response = await (window as any).originalFetch(REMOTE_URL + '/auth/status', { 
        method: 'HEAD', 
        cache: 'no-store' 
      });
      
      if (response.ok || response.status === 401) {
        console.log(">>> [SİSTEM NOTU] İnternet bağlantısı geri geldi. 'UZAK MOD' aktif ediliyor.");
        setRemoteDown(false);
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
      }
    } catch (e) {
      // Hala yok
    }
  }, 120000); 
};

// ─── Axios Interceptors ────────────────────────────────────────────────────────

axios.interceptors.request.use((config) => {
  if (getRemoteDown() && config.url?.startsWith(REMOTE_URL)) {
    config.url = config.url.replace(REMOTE_URL, LOCAL_URL);
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config || config._retry || config.url?.includes(LOCAL_URL)) {
      return Promise.reject(error);
    }

    if (isNetworkError(error)) {
      if (!getRemoteDown()) {
        setRemoteDown(true);
        startHealthCheck();
      }
      
      config._retry = true;
      config.url = config.url.replace(REMOTE_URL, LOCAL_URL);
      config.timeout = 2000;
      return axios(config);
    }

    return Promise.reject(error);
  }
);

// ─── Fetch Wrapper ─────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  (window as any).originalFetch = originalFetch;

  window.fetch = async (...args) => {
    let [resource, config] = args;
    let url = typeof resource === 'string' ? resource : (resource as Request).url;

    // Eğer yerel moddaysak direkt yereli çağır (HİÇBİR LOG BASMA, HIZLI GEÇ)
    if (getRemoteDown() && url.startsWith(REMOTE_URL)) {
      url = url.replace(REMOTE_URL, LOCAL_URL);
      if (typeof resource === 'string') resource = url;
    }

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      
      const response = await originalFetch(resource, {
        ...config,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (err: any) {
      if (url.startsWith(REMOTE_URL)) {
        if (!getRemoteDown()) {
          setRemoteDown(true);
          startHealthCheck();
        }
        
        const localUrl = url.replace(REMOTE_URL, LOCAL_URL);
        return originalFetch(localUrl, config);
      }
      throw err;
    }
  };
}

// ─── Socket.io Fallback ─────────────────────────────────────────────────────────

export { REMOTE_URL, LOCAL_URL };

export function createSocket(namespaceOrOpts?: string | Record<string, any>, options?: Record<string, any>) {
  const { io } = require('socket.io-client');
  
  let namespace = '';
  let opts = options || {};

  if (typeof namespaceOrOpts === 'string') {
    namespace = namespaceOrOpts;
  } else if (typeof namespaceOrOpts === 'object') {
    opts = namespaceOrOpts;
  }

  const defaultOpts = {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 3000,
    ...opts,
  };

  const getFullUrl = (baseUrl: string) => {
    const base = baseUrl.replace(/\/+$/, '');
    const ns = namespace ? (namespace.startsWith('/') ? namespace : `/${namespace}`) : '';
    return base + ns;
  };

  const remoteFullUrl = getFullUrl(REMOTE_URL);
  const localFullUrl = getFullUrl(LOCAL_URL);

  if (getRemoteDown()) {
    console.log(`[Socket Fast-Local] Yerel mod aktif, doğrudan bağlanılıyor: ${localFullUrl}`);
    return io(localFullUrl, defaultOpts);
  }

  const socket = io(remoteFullUrl, defaultOpts);
  
  let hasConnected = false;
  let fallbackApplied = false;

  socket.on('connect', () => {
    hasConnected = true;
    console.log(`[Socket.io] Bağlantı başarılı: ${remoteFullUrl}`);
  });

  socket.on('connect_error', () => {
    if (!hasConnected && !fallbackApplied) {
      fallbackApplied = true;
      setRemoteDown(true);
      startHealthCheck();
      
      console.log(`[Socket.io Fallback] Localhost'a yönlendiriliyor: ${localFullUrl}`);
      socket.disconnect();
      socket.io.uri = LOCAL_URL;
      socket.connect();
    }
  });

  return socket;
}
