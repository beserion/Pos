'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface AlertNotification {
  id: number;
  eventKey: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  displayMode: 'POPUP' | 'LIST' | 'SILENT';
  targetUserId?: number;
  targetRoleId?: number;
  triggerUserId?: number;
  triggerUserName?: string;
  saleId?: number;
  tableId?: number;
  tableName?: string;
  relatedId?: number;
  description: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export function useAlerts(userId: number | null, roleId?: number | null) {
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [criticalPopup, setCriticalPopup] = useState<AlertNotification | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const getApiUrl = () => {
    if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';
    
    const hostname = window.location.hostname;
    // Eğer localhost veya yerel bir IP ise (192.168... veya 10... gibi) yerel API'yi dene
    if (hostname === 'localhost' || hostname === '127.0.0.1' || /^192\.168\./.test(hostname) || /^10\./.test(hostname)) {
      return `http://${hostname}:3050`;
    }
    
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';
  };

  const API_URL = getApiUrl();

  /** İlk yüklemede REST'ten mevcut bildirimleri çek */
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const token = localStorage.getItem('token');
      const url = `${API_URL}/alerts/notifications?userId=${userId}${roleId ? `&roleId=${roleId}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data: AlertNotification[] = await res.json();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    } catch { /* sessiz hata */ }
  }, [userId, roleId]);

  /** WebSocket bağlantısı */
  useEffect(() => {
    if (!userId) return;

    const socket = io(`${API_URL}/alerts`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('alert:join', { userId, roleId: roleId ?? undefined });
    });

    socket.on('alert:unread_count', ({ count }: { count: number }) => {
      setUnreadCount(count);
    });

    socket.on('alert:new', (notification: AlertNotification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 100));
      if (!notification.isRead) {
        setUnreadCount((prev) => prev + 1);
      }

      // Kritik popup tetikle
      if (notification.severity === 'CRITICAL' && notification.displayMode === 'POPUP') {
        setCriticalPopup(notification);
      }
    });

    // İlk yükleme
    fetchNotifications();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, roleId]);

  /** Tek bildirimi okundu işaretle */
  const markAsRead = useCallback(async (id: number) => {
    if (!userId) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/alerts/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* sessiz hata */ }
  }, [userId]);

  /** Tüm bildirimleri okundu işaretle */
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/alerts/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, roleId }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* sessiz hata */ }
  }, [userId, roleId]);

  /** Popup'ı kapat */
  const dismissPopup = useCallback(() => {
    if (criticalPopup) {
      markAsRead(criticalPopup.id);
      setCriticalPopup(null);
    }
  }, [criticalPopup, markAsRead]);

  return {
    notifications,
    unreadCount,
    criticalPopup,
    markAsRead,
    markAllAsRead,
    dismissPopup,
    refresh: fetchNotifications,
  };
}
