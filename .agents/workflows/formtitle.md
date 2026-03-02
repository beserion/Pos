---
description: Standardized page title structure (formtitle) for all POSAPP screens
---

# Form Title (formtitle) - POSAPP React/Next.js Standard

Sayfa başlığında kullanılacak standart yapı. Kullanıcı **formtitle** dediğinde bu düzeni uygula.
**Önemli**: Mevcut sayfanın yazı içeriğini ve renklerini değiştirme. Sadece yapıyı (layout, spacing, font stili) uygula.

## Yapı

- **Sol ikon**: FontAwesome Pro Thin (`fat fa-...`), 50px (`style={{ fontSize: '50px' }}`), yanında boşluk `me-3`
- **Başlık (h3)**: `font-extralight`, uppercase, geniş karakter aralığı `tracking-[0.25em]`, ikon ile aynı renk
- **Alt metin (h5)**: Normal cümle düzeni (uppercase KULLANMA), `font-medium`, `text-slate-400 dark:text-slate-500`, başlıkla arası `mt-0.5`
- **Sağ taraf**: Aksiyon butonları + "Geri Dön" butonu en sağda
- **Hizalama**: `flex items-center justify-between`
- **Sayfa container**: `w-full px-[50px]`
- **Scroll**: Veri azsa `h-screen overflow-hidden`, çoksa `min-h-screen`

## Örnek TSX

```tsx
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
    <div className="flex items-center">
        <i className="fat fa-boxes-stacked me-3 text-emerald-600 dark:text-emerald-400" style={{ fontSize: '50px' }}></i>
        <div>
            <h3 className="mb-0 text-3xl font-extralight text-emerald-600 dark:text-emerald-400 leading-none uppercase tracking-[0.25em]">Sayfa Başlığı</h3>
            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Alt açıklama metni</h5>
        </div>
    </div>

    <div className="flex gap-3">
        {/* Aksiyon butonu - soft renk */}
        <button className="px-6 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
            <i className="fat fa-plus-circle text-lg"></i> Yeni Kayıt
        </button>
        {/* Geri Dön butonu her zaman en sağda */}
        <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"
        >
            <i className="fat fa-arrow-left"></i> Geri Dön
        </button>
    </div>
</div>
```

## Kurallar

1. **Renkleri koruma**: Sayfanın mevcut tema renklerini (ikon, başlık, buton) değiştirme. Sadece yapısal stili uygula.
2. **İçeriği koruma**: Başlık metni, alt metin, buton etiketleri olduğu gibi kalsın.
3. **Başlık fontu**: Daima `font-extralight` + `tracking-[0.25em]` + `uppercase` + `leading-none`
4. **Alt metin fontu**: Daima `font-medium` + `mt-0.5` + normal case (uppercase değil)
5. **İkon ve başlık rengi aynı olmalı** (örn. ikisi de `text-indigo-600`)
6. **Aksiyon butonları soft renk**: Açık arka plan + border + tema rengi yazı (solid değil)
7. **Geri Dön butonu**: Her zaman en sağda, nötr stil (bg-white, border-slate)
8. **Container**: `w-full px-[50px]`

## Referans dosya

- Model sayfa: `frontend/src/app/admin/locations/page.tsx`
