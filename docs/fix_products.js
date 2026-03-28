const fs = require('fs');
let lines = fs.readFileSync('src/app/[locale]/admin/products/page.tsx', 'utf8').split('\n');

let genelStart = lines.findIndex(l => l.includes("{activeTab === 'genel' && ("));
let badGorselStart = lines.findIndex((l, i) => i > genelStart && l.includes("{activeTab === 'gorsel' && ("));
let badReceteStart = lines.findIndex((l, i) => i > badGorselStart && l.includes("{activeTab === 'recete' && ("));
let goodGorselStart = lines.findIndex((l, i) => i > badReceteStart && l.includes("{activeTab === 'gorsel' && ("));

if (badGorselStart !== -1 && goodGorselStart !== -1) {
    lines.splice(badGorselStart, goodGorselStart - badGorselStart);
    console.log('Deleted corrupted blocks.');
}

let newGoodGorselStart = lines.findIndex((l, i) => i > genelStart && l.includes("{activeTab === 'gorsel' && ("));
let missingDivIdx = lines.findIndex((l, i) => i > genelStart && i < newGoodGorselStart && l.trim() === ')}');
if (missingDivIdx !== -1) {
    lines.splice(missingDivIdx - 1, 0, '                                            </div>');
    console.log('Fixed missing div in genel block.');
}

let priceIdx = lines.findIndex((l, i) => i > genelStart && i < missingDivIdx && l.includes("{t('labelPrice')}"));
if (priceIdx !== -1) {
    let priceDivEnd = lines.findIndex((l, i) => i > priceIdx && l.includes('</div>'));
    let gridRowEnd = lines.findIndex((l, i) => i > priceDivEnd && l.includes('</div>'));

    const costMinStockBlock = [
        '                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">',
        '                                                    <div>',
        '                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t(\'labelCost\')}</label>',
        '                                                        <div className="relative">',
        '                                                            <i className="fat fa-tags absolute left-4 top-4 text-teal-500/50"></i>',
        '                                                            <input type="number" step="0.01" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="0.00" />',
        '                                                        </div>',
        '                                                    </div>',
        '                                                    <div>',
        '                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t(\'labelMinStock\')}</label>',
        '                                                        <div className="relative">',
        '                                                            <i className="fat fa-triangle-exclamation absolute left-4 top-4 text-teal-500/50"></i>',
        '                                                            <input type="number" step="1" value={formData.minStockLevel ?? \'\'} onChange={(e) => setFormData({ ...formData, minStockLevel: parseFloat(e.target.value) || 0 })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="0" />',
        '                                                        </div>',
        '                                                    </div>',
        '                                                </div>'
    ];
    lines.splice(gridRowEnd + 1, 0, ...costMinStockBlock);
    console.log('Added Cost and MinStock rows');
}

fs.writeFileSync('src/app/[locale]/admin/products/page.tsx', lines.join('\n'));
console.log('Done fixing products/page.tsx');
