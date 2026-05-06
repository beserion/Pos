
import re

content = """
                                                     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                         {/* Reçete Başlık Bilgileri */}
                                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-900/20 p-6 rounded-[24px] border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                                             <div>
                                                                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">REÇETE ADI (OPSİYONEL)</label>
                                                                 <div className="relative">
                                                                     <i className="fat fa-tag absolute left-4 top-3.5 text-slate-400 text-sm"></i>
                                                                     <input
                                                                         type="text"
                                                                         value={currentRecipe.name || ''}
                                                                         onChange={(e) => setCurrentRecipe({ ...currentRecipe, name: e.target.value })}
                                                                         className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-orange-500/50 outline-none transition-shadow"
                                                                         placeholder="Örn: Standart Reçete"
                                                                     />
                                                                 </div>
                                                             </div>
                                                             <div className="flex items-center pt-6 justify-between gap-4">
                                                                 <div
                                                                     onClick={() => setCurrentRecipe({ ...currentRecipe, isActive: !currentRecipe.isActive })}
                                                                     className={`flex-1 cursor-pointer flex items-center p-2.5 px-4 rounded-xl border transition-all duration-300 ${currentRecipe.isActive ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-500/10 shadow-sm shadow-emerald-500/10' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-600'}`}
                                                                 >
                                                                     <div className={`w-6 h-6 shrink-0 rounded flex items-center justify-center transition-colors ${currentRecipe.isActive ? 'bg-white text-emerald-600 shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                                                         {currentRecipe.isActive && <i className="fat fa-check text-xs"></i>}
                                                                     </div>
                                                                     <div className="ml-3 text-left">
                                                                         <h6 className={`text-[10px] font-black tracking-widest uppercase m-0 ${currentRecipe.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>Reçete Aktif</h6>
                                                                     </div>
                                                                 </div>
                                                                 <div className="flex gap-2 shrink-0">
                                                                     {currentRecipe.id > 0 && (
                                                                         <button type="button" onClick={handleDeleteRecipe} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-red-100 dark:border-red-900/30 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                                                             <i className="fat fa-trash-can text-sm"></i>
                                                                         </button>
                                                                     )}
                                                                     <button type="button" onClick={handleSaveRecipe} className="px-6 py-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:shadow-lg transition-all active:scale-95 border border-orange-600">
                                                                         <i className="fat fa-floppy-disk mr-1.5"></i> {tc('save')}
                                                                     </button>
                                                                 </div>
                                                             </div>
                                                         </div>
 
                                                         {/* Reçete Detay Tablosu */}
                                                         <div>
                                                            <div className="flex justify-between items-center mb-4 px-2">
                                                                <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 m-0">
                                                                    <i className="fat fa-list-check text-orange-500"></i> İçindekiler / Stok Kullanımı
                                                                </h4>
                                                                <button type="button" onClick={handleAddRecipeLine} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-orange-600 dark:text-orange-400 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all flex items-center gap-2">
                                                                    <i className="fat fa-plus text-xs"></i> Satır Ekle
                                                                </button>
                                                            </div>
 
                                                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                                                                <table className="w-full text-left border-collapse">
                                                                    <thead>
                                                                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black tracking-widest text-slate-400">
                                                                            <th className="px-6 py-4 w-[45%]">Stok Kartı (Kullanılacak Hammadde)</th>
                                                                            <th className="px-6 py-4 text-center">Miktar</th>
                                                                            <th className="px-6 py-4">Birim</th>
                                                                            <th className="px-6 py-4 text-center">Zorunlu</th>
                                                                            <th className="px-6 py-4"></th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                                        {(currentRecipe.lines || []).map((line, idx) => (
                                                                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                                                <td className="px-6 py-3">
                                                                                    <div className="-m-1.5 w-full">
                                                                                        <SearchableSelect
                                                                                            value={(line.stockCardId || '').toString()}
                                                                                            onChange={(val) => handleRecipeLineChange(idx, 'stockCardId', val ? parseInt(val) : 0)}
                                                                                            options={[
                                                                                                { value: '', label: 'Stok Kartı Seçin...' },
                                                                                                ...stockCards.map(c => ({ value: c.id.toString(), label: `${c.name} (${getUnitName(c.baseUnit || '')})` }))
                                                                                            ]}
                                                                                        />
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-6 py-3 text-center">
                                                                                    <input
                                                                                        type="number"
                                                                                        step="0.0001"
                                                                                        value={line.quantity ?? ''}
                                                                                        onChange={(e) => handleRecipeLineChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white font-black text-sm text-center focus:border-orange-500 outline-none transition-colors"
                                                                                    />
                                                                                </td>
                                                                                <td className="px-6 py-3">
                                                                                    <div className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 font-bold text-xs uppercase flex items-center justify-center min-h-[38px]">
                                                                                        {getUnitName(line.unit || '') || '-'}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-6 py-3 text-center">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleRecipeLineChange(idx, 'isRequired', !line.isRequired)}
                                                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${line.isRequired ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}
                                                                                    >
                                                                                        <i className={`fat ${line.isRequired ? 'fa-check' : 'fa-minus'} text-xs`}></i>
                                                                                    </button>
                                                                                </td>
                                                                                <td className="px-6 py-3 text-right">
                                                                                    <button type="button" onClick={() => handleRemoveRecipeLine(idx)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center inline-flex">
                                                                                        <i className="fat fa-trash-can text-sm"></i>
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                        {(currentRecipe.lines || []).length === 0 && (
                                                                            <tr>
                                                                                <td colSpan={5} className="py-20 text-center">
                                                                                    <div className="flex flex-col items-center opacity-30">
                                                                                        <i className="fat fa-scroll text-5xl mb-4 text-slate-400"></i>
                                                                                        <p className="text-sm font-black uppercase tracking-widest text-slate-500">Reçete Henüz Boş</p>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                         </div>
 
                                                         {/* Maliyet Özeti Bölümü */}
                                                         {recipeSummary && (currentRecipe.lines?.length || 0) > 0 && currentRecipe.id > 0 && (
                                                            <div className="bg-gradient-to-br from-slate-50 to-orange-50 dark:from-slate-900/50 dark:to-orange-900/10 p-6 rounded-[32px] border border-orange-100 dark:border-orange-500/20 shadow-sm">
                                                                <h4 className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-6 flex items-center gap-2 m-0">
                                                                    <i className="fat fa-chart-pie"></i> Reçete Maliyet Özeti
                                                                </h4>
 
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Satış Fiyatı</p>
                                                                        <p className="text-xl font-black text-slate-800 dark:text-white">₺{recipeSummary.salePrice?.toFixed(2) || '0.00'}</p>
                                                                    </div>
                                                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-rose-100 dark:border-rose-900/30">
                                                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Toplam Maliyet</p>
                                                                        <p className="text-xl font-black text-rose-600 dark:text-rose-400">₺{recipeSummary.foodCost?.toFixed(2) || '0.00'}</p>
                                                                    </div>
                                                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                                                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Kâr Tutarı</p>
                                                                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">₺{recipeSummary.profit?.toFixed(2) || '0.00'}</p>
                                                                    </div>
                                                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-indigo-100 dark:border-indigo-900/30">
                                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Cost Oranı</p>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className={`h-full rounded-full ${recipeSummary.costRatio > 50 ? 'bg-rose-500' : recipeSummary.costRatio > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                                                    style={{ width: `${Math.min(recipeSummary.costRatio || 0, 100)}%` }}
                                                                                ></div>
                                                                            </div>
                                                                            <p className="text-base leading-none font-black text-indigo-600 dark:text-indigo-400">
                                                                                %{recipeSummary.costRatio?.toFixed(1) || '0.0'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                         )}
"""

lines = content.split('\n')
stack = []
for i, line in enumerate(lines):
    # Find all div openings and closings in this line
    for match in re.finditer(r'<div|</div', line):
        token = match.group()
        if token == '<div':
            stack.append(i + 1)
        else:
            if stack:
                stack.pop()
            else:
                print(f"Error: Closing tag without opening at line {i+1}")

if stack:
    print(f"Error: Unclosed divs opened at lines: {stack}")
else:
    print("All divs closed correctly.")


