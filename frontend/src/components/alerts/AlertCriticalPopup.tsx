'use client';
import { useEffect, useState } from 'react';
import { AlertNotification } from '../../hooks/useAlerts';

interface AlertCriticalPopupProps {
  notification: AlertNotification | null;
  onDismiss: () => void;
}

const EVENT_LABELS: Record<string, string> = {
  SALE_CANCELLED: 'Adisyon İptal',
  SALE_DISCOUNT_HIGH: 'Yüksek İndirim',
  SALE_COMPLIMENTARY: 'İkram',
  PAYMENT_METHOD_CHANGE: 'Ödeme Tipi Değişimi',
  END_OF_DAY: 'Gün Sonu',
  PIN_FAIL_LIMIT: 'Hatalı PIN Girişi',
  LOGIN_FAIL_LIMIT: 'Başarısız Giriş',
  OVERRIDE_USED: 'Yetkili Override',
  STOCK_LOW: 'Kritik Stok',
  KIOSK_CANCEL: 'Kiosk İptal',
  CASH_DRAWER_OPEN: 'Kasa Açıldı',
  CASH_DRAWER_CLOSE: 'Kasa Kapandı',
};

export function AlertCriticalPopup({ notification, onDismiss }: AlertCriticalPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
    }
  }, [notification]);

  if (!notification || !visible) return null;

  const label = EVENT_LABELS[notification.eventKey] || notification.eventKey;
  const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-red-500/50 max-w-md w-full animate-bounce-once overflow-hidden">
        {/* Kırmızı üst şerit */}
        <div className="h-1.5 bg-gradient-to-r from-red-500 to-orange-500 w-full" />

        <div className="p-6">
          {/* Başlık */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
              <i className="fat fa-triangle-exclamation text-red-500 text-xl animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-red-500 mb-0.5">⚠ KRİTİK BİLDİRİM</p>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">{label}</h3>
              <p className="text-xs text-slate-400">{now}</p>
            </div>
          </div>

          {/* Mesaj */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{notification.description}</p>
          </div>

          {/* Detaylar */}
          {(notification.tableName || notification.triggerUserName || notification.saleId) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {notification.tableName && (
                <span className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg px-3 py-1.5">
                  <i className="fat fa-chair-office text-slate-400" /> {notification.tableName}
                </span>
              )}
              {notification.triggerUserName && (
                <span className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg px-3 py-1.5">
                  <i className="fat fa-user text-slate-400" /> {notification.triggerUserName}
                </span>
              )}
              {notification.saleId && (
                <span className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg px-3 py-1.5">
                  <i className="fat fa-receipt text-slate-400" /> #{notification.saleId}
                </span>
              )}
            </div>
          )}

          {/* Buton */}
          <button
            id="alert-popup-dismiss-btn"
            onClick={() => { setVisible(false); onDismiss(); }}
            className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-sm transition-colors shadow-lg shadow-red-500/30"
          >
            <i className="fat fa-check mr-2" /> Anladım, Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
