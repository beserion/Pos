---
description: Premium Upsert Modal Structure (modal-rule) used in POSAPP
---
# Premium Upsert Modal Kuralı

Bu kural, `/customers` sayfasındaki modern, glassmorphism destekli ve yüksek kaliteli modal yapısını standartlaştırır. Yeni bir modal veya düzenleme (upsert) formu oluştururken bu yapı kullanılmalıdır.

## Yapı (JSX/React)

### 1. Overlay (Arka Plan)
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
    {/* Modal Container */}
</div>
```

### 2. Modal Konteynırı
- **Genişlik**: `max-w-2xl` (veya veriye göre `max-w-4xl`)
- **Köşeler**: `rounded-[32px]` (Ekstra yuvarlak, premium görünüm)
- **Gölge & Border**: `shadow-2xl border border-white/20 dark:border-slate-700/50`

```tsx
<div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50">
    {/* Header, Body, Footer */}
</div>
```

### 3. Header (Başlık)
- **İkonlar**: Başlık yanında ilgili modül ikonu (`fat fa-...`).
- **Kapatma**: Sağ üstte yuvarlak (`rounded-2xl`) kapatma butonu.

```tsx
<div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
    <div>
        <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <i className="fat fa-[ICON] text-purple-600"></i> [BAŞLIK]
        </h2>
        <p className="text-xs text-slate-400 mt-1">[ALT AÇIKLAMA]</p>
    </div>
    <button onClick={...} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors text-xl">&times;</button>
</div>
```

### 4. Body (Form Alanları)
- **Padding**: `p-6`
- **Giriş Alanları**: `bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl`

```tsx
<div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
    <div className="grid grid-cols-2 gap-4">
        <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Etiket *</label>
            <input className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 outline-none" />
        </div>
    </div>
</div>
```

### 5. Footer (Butonlar)
- **Hizalama**: `justify-between` (İptal solda, Kaydet sağda).
- **İptal**: `bg-slate-100`, `fa-times-circle` ikonlu.
- **Kaydet**: `bg-gradient-to-r from-purple-600 to-indigo-600`, `fa-check-circle` ikonlu, `hover:scale-105`.

```tsx
<div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-between">
    <button onClick={...} className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center gap-2">
        <i className="fat fa-times-circle"></i> İptal
    </button>
    <button onClick={...} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 hover:scale-105 transition-all flex items-center gap-2">
        <i className="fat fa-check-circle"></i> Kaydet
    </button>
</div>
```

## Özet İpuçları
- Mutlaka `backdrop-blur-xl` kullan.
- Butonlarda `active:scale-95` ekleyerek etkileşimi artır.
- Input odaklandığında (`focus`) hafif mor ring (`focus:ring-purple-500/20`) uygula.
