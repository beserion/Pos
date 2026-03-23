'use client';
import { useState, useRef, useEffect } from 'react';
import { AlertNotification } from '../../hooks/useAlerts';

interface AlertsBellProps {
  notifications: AlertNotification[];
  unreadCount: number;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
}

const SEVERITY_CONFIG = {
  CRITICAL: { color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/30', dot: 'bg-red-500', label: 'Kritik' },
  WARNING:  { color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30', dot: 'bg-amber-500', label: 'Uyarı' },
  INFO:     { color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/30', dot: 'bg-blue-400', label: 'Bilgi' },
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}sn önce`;
  if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
  return `${Math.floor(diff / 86400)}g önce`;
}

export function AlertsBell({ notifications, unreadCount, onMarkAsRead, onMarkAllAsRead }: AlertsBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Yeni bildirim geldiğinde ses çal (unreadCount arttığında)
  const prevUnreadCountRef = useRef(unreadCount);
  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5; // Orta ses seviyesi
      audio.play().catch(e => console.error('Bildirim sesi çalınamadı:', e));
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const visibleNotifications = notifications.slice(0, 20);

  return (
    <div ref={ref} className="relative">
      {/* Zil ikonu */}
      <button
        id="alerts-bell-btn"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        title="Bildirimler"
      >
        <i className="fat fa-bell text-slate-600 dark:text-slate-300 text-base" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 animate-pulse shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="fixed top-16 left-[2px] right-[2px] sm:absolute sm:top-11 sm:left-auto sm:right-0 z-[999] sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <i className="fat fa-bell text-violet-500" />
              <span className="font-bold text-sm text-slate-800 dark:text-white">Bildirimler</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5">{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => { onMarkAllAsRead(); }}
                className="text-xs text-violet-500 hover:text-violet-700 font-semibold transition-colors"
              >
                Tümünü Oku
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {visibleNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <i className="fat fa-bell-slash text-3xl mb-2" />
                <p className="text-sm">Bildirim yok</p>
              </div>
            ) : (
              visibleNotifications.map((n) => {
                const cfg = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.INFO;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${!n.isRead ? 'bg-violet-50/40 dark:bg-violet-500/5' : ''}`}
                  >
                    {/* Seviye göstergesi */}
                    <div className="flex-shrink-0 mt-0.5">
                      <span className={`inline-block w-2 h-2 rounded-full ${cfg.dot} mt-1.5`} />
                    </div>

                    {/* İçerik */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[10px] font-black uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-[10px] text-slate-400">{n.eventKey}</span>
                        {!n.isRead && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug line-clamp-2">{n.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {n.tableName && (
                          <span className="text-[10px] text-slate-400"><i className="fat fa-chair-office mr-0.5" />{n.tableName}</span>
                        )}
                        {n.triggerUserName && (
                          <span className="text-[10px] text-slate-400"><i className="fat fa-user mr-0.5" />{n.triggerUserName}</span>
                        )}
                        <span className="text-[10px] text-slate-400 ml-auto">{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>

                    {/* Oku butonu */}
                    {!n.isRead && (
                      <button
                        onClick={() => onMarkAsRead(n.id)}
                        className="flex-shrink-0 text-violet-400 hover:text-violet-600 transition mt-0.5"
                        title="Okundu işaretle"
                      >
                        <i className="fat fa-check text-xs" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 20 && (
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-center">
              <a href="/tr/admin/alerts" className="text-xs text-violet-500 hover:text-violet-700 font-semibold">
                Tüm bildirimleri gör →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
