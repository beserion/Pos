---
description: [modern toggle checkbox yapısı (modern-toggle)]
---
# Modern Toggle Button (modern-toggle)

Proje genelindeki form modallarında "Aktif/Pasif" vb. durum checkbox'ları istendiğinde standart (input type="checkbox" form-switch) yerine bu glassmorphism / animated modern tasarımı kullanın.

## HTML / React JSX Yapısı

```tsx
<div>
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
        Durum (Aktif / Pasif)
    </label>
    <button
        type="button"
        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
        className={`w-full h-[52px] px-4 rounded-2xl flex items-center justify-between transition-all border outline-none ${
            formData.isActive 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-500'
        }`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${formData.isActive ? 'bg-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800'}`}>
                <i className={`fat fa-power-off ${formData.isActive ? 'text-emerald-500' : 'text-slate-400'}`}></i>
            </div>
            <span className="font-bold text-sm tracking-wide">
                {formData.isActive ? 'AKTİF' : 'PASİF'}
            </span>
        </div>
        <div className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors duration-300 ${formData.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 flex-shrink-0 ${formData.isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </div>
    </button>
</div>
```

## Notlar
- `h-[52px]` kullanılması, aynı satırdaki veya standart text input yükseklikleri (paddingli) ile birebir esneklik sağlaması içindir. Ekrana göre `52px` veya `54px` (input yüksekliğine bağlı) verebilirsiniz.
- `bg-emerald-500/10` Tailwind glassmorphism efekti sağlamaktadır. Projedeki Dark Mode `dark:bg-slate-...` özellikleri de desteklenmelidir.
- Sadece "Aktif" değil, onaysal bütün check tipleri için ikon (örn. `fa-check`) ve renk uyarlanarak kullanılabilir.
