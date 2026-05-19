'use client';
import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '@/lib/apiConfig';

export interface AppParameters {
  // POS & Satış
  default_payment_method: string;
  service_fee_rate: number;
  tax_rate: number;
  available_tax_rates: string;
  allow_discount: boolean;
  max_discount_rate: number;
  receipt_footer: string;
  screen_timeout: number;  // dakika cinsinden — 0 = devre dışı
  shift_system_enabled: boolean;
  waiters_can_order_to_any_table: boolean;
  show_change_calculator: boolean;

  // Mutfak
  warning_time: number;
  critical_time: number;
  auto_refresh_interval: number;
  beep_on_new_order: boolean;
  show_waiter_name: boolean;

  // Mutfak Ekranı (KDS Modülü)
  kitchen_display_enabled: boolean;
  kitchen_item_selection_enabled: boolean;
  kitchen_finished_screen_timeout: number;
  kitchen_printer_only: boolean;
  kitchen_printer_name: string;

  // Yazıcı
  receipt_copies: number;
  kitchen_copies: number;
  print_logo: boolean;
  paper_width: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  print_receipt_on_payment: boolean;

  // Marş
  mars_enabled: boolean;
  mars_default_items: boolean;
  mars_sound: boolean;

  // Masa
  auto_close_table: boolean;
  show_table_total: boolean;
  show_waiter_on_table: boolean;
  order_start_alert: number;

  // Finans
  currency: string;
  currency_symbol: string;
  fiscal_year_start: string;
  auto_invoice: boolean;

  // Görünüm
  dashboard_column_count: number;

  // Yarım / Duble
  half_price_multiplier: number;
  double_price_multiplier: number;
  half_recipe_multiplier: number;
  double_recipe_multiplier: number;

  // Ürün Seçenekleri
  auto_open_product_options: boolean;

  // Kurlar
  eur_rate: number;
  usd_rate: number;
  gbp_rate: number;
}

// Varsayılan değerler (DB'den gelmezse fallback)
export const DEFAULT_PARAMS: AppParameters = {
  default_payment_method: 'KASA',
  service_fee_rate: 10,
  tax_rate: 8,
  available_tax_rates: '20,0,1,10',
  allow_discount: true,
  max_discount_rate: 20,
  receipt_footer: 'Teşekkür ederiz! Tekrar bekleriz.',
  screen_timeout: 180,  // 180 saniye varsayılan (3 dakika)
  shift_system_enabled: true,
  waiters_can_order_to_any_table: true,
  show_change_calculator: true,

  warning_time: 10,
  critical_time: 20,
  auto_refresh_interval: 10,
  beep_on_new_order: true,
  show_waiter_name: true,

  kitchen_display_enabled: true,
  kitchen_item_selection_enabled: true,
  kitchen_finished_screen_timeout: 30, // 30 seconds default
  kitchen_printer_only: true,
  kitchen_printer_name: '',

  receipt_copies: 1,
  kitchen_copies: 1,
  print_logo: false,
  paper_width: '80mm',
  company_name: '',
  company_address: '',
  company_phone: '',
  print_receipt_on_payment: true,

  mars_enabled: true,
  mars_default_items: false,
  mars_sound: true,

  auto_close_table: true,
  show_table_total: true,
  show_waiter_on_table: true,
  order_start_alert: 30,

  currency: 'TRY',
  currency_symbol: '₺',
  fiscal_year_start: 'Ocak',
  auto_invoice: false,

  dashboard_column_count: 4,

  half_price_multiplier: 0.50,
  double_price_multiplier: 1.70,
  half_recipe_multiplier: 0.50,
  double_recipe_multiplier: 2.00,

  auto_open_product_options: true,

  eur_rate: 37.50,
  usd_rate: 35.20,
  gbp_rate: 44.10,
};

// Tip dönüşüm yardımcısı
function castValue(key: keyof AppParameters, raw: string): any {
  const defaults = DEFAULT_PARAMS;
  const defaultVal = (defaults as any)[key];
  if (typeof defaultVal === 'boolean') return raw === 'true';
  if (typeof defaultVal === 'number') return Number(raw);
  return raw;
}

// Global cache (sayfa geçişlerinde tekrar çekmesin)
let _cache: Partial<AppParameters> | null = null;
let _cacheTime = 0;
const CACHE_TTL = 30_000; // 30 saniye

export async function fetchAllParameters(token?: string): Promise<AppParameters> {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL) {
    return { ...DEFAULT_PARAMS, ..._cache } as AppParameters;
  }

  try {
    const res = await fetch(`${API_URL}/parameters`, {
      headers: { Authorization: `Bearer ${token || localStorage.getItem('token') || ''}` },
    });
    if (!res.ok) return DEFAULT_PARAMS;

    const data: { module: string; key: string; value: string }[] = await res.json();
    const parsed: Partial<AppParameters> = {};

    for (const item of data) {
      const key = item.key as keyof AppParameters;
      if (key in DEFAULT_PARAMS) {
        (parsed as any)[key] = castValue(key, item.value);
      }
    }

    _cache = parsed;
    _cacheTime = now;
    return { ...DEFAULT_PARAMS, ...parsed };
  } catch {
    return DEFAULT_PARAMS;
  }
}

// Cache'i geçersiz kıl (kaydetme sonrası çağrılır)
export function invalidateParameterCache() {
  _cache = null;
  _cacheTime = 0;
}

// React hook
export function useParameters(modules?: string[]): { params: AppParameters; loading: boolean; reload: () => void } {
  const [params, setParams] = useState<AppParameters>(DEFAULT_PARAMS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await fetchAllParameters();
    setParams(all);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { params, loading, reload: load };
}
