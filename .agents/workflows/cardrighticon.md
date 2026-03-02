---
description: KPI card with right-side icon, bottom glow hover effect (cardrighticon)
---

# Card Right Icon (cardrighticon) - POSAPP React/Next.js Standard

KPI/özet kartlarında kullanılacak standart yapı. Kullanıcı **cardrighticon** dediğinde bu düzeni uygula.
**Önemli**: Mevcut kartların içerik ve renklerini değiştirme. Sadece yapıyı uygula.

## Yapı

- **Kart**: `bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700`
- **Layout**: `flex items-center justify-between` — sol tarafta metin, sağ tarafta ikon
- **Gölge yok**: Varsayılan durumda shadow yok (flat)
- **Hover**: Border rengi değişir + alttan ışık/glow efekti + hafif büyüme
- **Etiket**: `text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1`
- **Değer**: `text-3xl font-black text-slate-800 dark:text-white`
- **İkon kutusu**: `w-16 h-16 rounded-2xl` + tema renginde açık arka plan
- **İkon**: FontAwesome Pro Thin (`fat fa-...`), `text-3xl`

## Hover Efekti

Her kart kendi tema renginde alttan glow (bottom light) ve border rengi değişimi alır:

```
hover:border-{color}-300 dark:hover:border-{color}-500/40
hover:shadow-[0_8px_30px_-5px_rgba(R,G,B,0.3)]
hover:scale-[1.02]
cursor-pointer
transition-all
```

### Renk RGB değerleri (glow shadow için)
- indigo: `rgba(99,102,241,0.3)`
- emerald: `rgba(16,185,129,0.3)`
- amber: `rgba(245,158,11,0.3)`
- purple: `rgba(168,85,247,0.3)`
- rose: `rgba(244,63,94,0.3)`
- cyan: `rgba(6,182,212,0.3)`
- teal: `rgba(20,184,166,0.3)`
- blue: `rgba(59,130,246,0.3)`
- red: `rgba(239,68,68,0.3)`

## Örnek TSX

```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
    {/* Kart 1 - indigo */}
    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-[0_8px_30px_-5px_rgba(99,102,241,0.3)] hover:scale-[1.02] cursor-pointer">
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Etiket</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{value}</h3>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <i className="fat fa-icon text-3xl"></i>
        </div>
    </div>

    {/* Kart 2 - emerald */}
    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer">
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Etiket</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{value}</h3>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <i className="fat fa-icon text-3xl"></i>
        </div>
    </div>
</div>
```

## Kurallar

1. **Renkleri koruma**: Mevcut kartların tema renklerini değiştirme
2. **İçeriği koruma**: Etiket ve değer metinleri olduğu gibi kalsın
3. **Hover glow rengi**: Kartın ikon rengine göre eşleştir (yukarıdaki RGB tablosu)
4. **Grid**: Varsayılan `md:grid-cols-4`, kart sayısına göre ayarla
5. **Gölge yok**: Varsayılan durumda shadow kullanma, sadece hover'da glow ver

## Referans dosya

- Model sayfa: `frontend/src/app/admin/tables/page.tsx`
