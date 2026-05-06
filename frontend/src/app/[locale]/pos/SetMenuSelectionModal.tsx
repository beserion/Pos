import React, { useState, useEffect } from 'react';
import { toastSwal } from '../utils/swal';

interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
    imageUrl?: string;
    isSet?: boolean;
    setMenu?: {
        setType: string;
        bundleEntitlementLimit?: number;
        groups: {
            id?: number;
            groupName: string;
            minSelect: number;
            maxSelect: number;
            items: {
                productId: number;
                priceDiff: number;
                isDefault: boolean;
                entitlementCost?: number;
            }[];
        }[];
    };
}

interface SetMenuSelectionModalProps {
    isOpen: boolean;
    product: Product;
    allProducts: Product[];
    onClose: () => void;
    onConfirm: (subItems: any[], extraPrice: number) => void;
}

export default function SetMenuSelectionModal({ isOpen, product, allProducts, onClose, onConfirm }: SetMenuSelectionModalProps) {
    const [selections, setSelections] = useState<Record<number, { productId: number, quantity: number, priceDiff: number, entitlementCost: number }[]>>({});
    
    // Initialize default selections when modal opens
    useEffect(() => {
        if (isOpen && product.setMenu) {
            const initialSelections: Record<number, any[]> = {};
            product.setMenu.groups.forEach((group, gIdx) => {
                const defaultItems = group.items.filter(item => item.isDefault);
                initialSelections[gIdx] = defaultItems.map(item => ({
                    productId: item.productId,
                    quantity: 1,
                    priceDiff: item.priceDiff || 0,
                    entitlementCost: item.entitlementCost || 1
                }));
            });
            setSelections(initialSelections);
        }
    }, [isOpen, product]);

    if (!isOpen || !product.setMenu) return null;

    const handleItemToggle = (gIdx: number, item: any, maxSelect: number) => {
        setSelections(prev => {
            const groupSelections = prev[gIdx] || [];
            const existingIdx = groupSelections.findIndex(s => s.productId === item.productId);
            
            let newGroupSelections = [...groupSelections];

            if (existingIdx >= 0) {
                // Remove item if already selected
                newGroupSelections.splice(existingIdx, 1);
            } else {
                const isBundle = product.setMenu?.setType === 'BUNDLE';
                const limit = product.setMenu?.bundleEntitlementLimit || 0;
                
                if (isBundle && limit > 0) {
                    const currentTotalPoints = Object.values(prev).flat().reduce((sum, s) => sum + (s.entitlementCost * s.quantity), 0);
                    const itemCost = item.entitlementCost || 1;
                    
                    if (currentTotalPoints + itemCost > limit) {
                        toastSwal({ title: 'Hallediş Sınırı', text: 'Toplam seçim hakkınızı aştınız.', icon: 'warning' });
                        return prev;
                    }
                }

                // Add item if we haven't reached maxSelect (for non-bundle or if sub-limit exists)
                if (groupSelections.length < maxSelect) {
                    newGroupSelections.push({
                        productId: item.productId,
                        quantity: 1,
                        priceDiff: item.priceDiff || 0,
                        entitlementCost: item.entitlementCost || 1
                    });
                } else if (maxSelect === 1) {
                    // For single selection, replace the current item
                    newGroupSelections = [{
                        productId: item.productId,
                        quantity: 1,
                        priceDiff: item.priceDiff || 0,
                        entitlementCost: item.entitlementCost || 1
                    }];
                } else {
                    return prev; // Reached max
                }
            }

            return { ...prev, [gIdx]: newGroupSelections };
        });
    };

    const getExtraPrice = () => {
        let total = 0;
        Object.values(selections).forEach(groupSel => {
            groupSel.forEach(sel => {
                total += (sel.priceDiff * sel.quantity);
            });
        });
        return Number(total.toFixed(2));
    };

    const isConfirmEnabled = () => {
        if (!product.setMenu) return false;
        
        const isBundle = product.setMenu.setType === 'BUNDLE';
        const limit = product.setMenu.bundleEntitlementLimit || 0;

        if (isBundle && limit > 0) {
            const currentTotalPoints = Object.values(selections).flat().reduce((sum, s) => sum + (s.entitlementCost * s.quantity), 0);
            return currentTotalPoints > 0; // Allow partial if it's a bundle? Or must it be exact? 
            // Usually bundle must stay within limit.
        }

        // Check if all groups have met their minSelect requirement
        return product.setMenu.groups.every((group, gIdx) => {
            const groupSelCount = (selections[gIdx] || []).reduce((sum, sel) => sum + sel.quantity, 0);
            return groupSelCount >= group.minSelect;
        });
    };

    const handleConfirm = () => {
        if (!isConfirmEnabled()) return;
        
        const subItems: any[] = [];
        Object.entries(selections).forEach(([gIdx, groupSel]) => {
            const groupNameStr = product.setMenu!.groups[Number(gIdx)].groupName;
            groupSel.forEach(sel => {
                subItems.push({
                    productId: sel.productId,
                    quantity: sel.quantity,
                    unitPrice: sel.priceDiff, // The extra price cost
                    menuGroupId: groupNameStr // use groupName instead of group id
                });
            });
        });

        onConfirm(subItems, getExtraPrice());
    };

    const extraPrice = getExtraPrice();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 flex items-center justify-center text-2xl shadow-inner">
                            <i className="fat fa-layer-group"></i>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-0 capitalize">{product.name}</h2>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 capitalize tracking-widest mt-0.5">Lütfen içerik seçimi yapınız</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                        <i className="fat fa-times text-lg"></i>
                    </button>
                </div>

                {product.setMenu.setType === 'BUNDLE' && product.setMenu.bundleEntitlementLimit && (
                    <div className="px-6 py-4 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-800/50 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center text-sm shadow-lg shadow-orange-500/30">
                                <i className="fat fa-ticket"></i>
                            </div>
                            <span className="text-sm font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest">Kampanya Hakediş Puanı</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-orange-600 dark:text-orange-400">
                                {Object.values(selections).flat().reduce((sum, s) => sum + (s.entitlementCost * s.quantity), 0)}
                            </span>
                            <span className="text-orange-300 dark:text-orange-700 text-xl font-light">/</span>
                            <span className="text-xl font-bold text-orange-400 dark:text-orange-600">
                                {product.setMenu.bundleEntitlementLimit}
                            </span>
                        </div>
                    </div>
                )}
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50 dark:bg-slate-900/50">
                    {product.setMenu.groups.map((group, gIdx) => {
                        const currentSelCount = (selections[gIdx] || []).reduce((sum, sel) => sum + sel.quantity, 0);
                        const isMet = currentSelCount >= group.minSelect;
                        
                        return (
                            <div key={gIdx} className={`bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 transition-colors ${!isMet ? 'border-amber-200 dark:border-amber-500/30' : 'border-emerald-200 dark:border-emerald-500/30'} shadow-sm`}>
                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-700 dark:text-slate-200">{group.groupName}</h3>
                                        <p className={`text-xs font-bold mt-1 ${isMet || product.setMenu?.setType === 'BUNDLE' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                            {product.setMenu?.setType === 'BUNDLE' 
                                                ? `${(selections[gIdx] || []).reduce((sum, s) => sum + (s.entitlementCost * s.quantity), 0)} Puan Seçildi`
                                                : `${currentSelCount} / ${group.maxSelect} Seçildi`
                                            }
                                            {product.setMenu?.setType !== 'BUNDLE' && group.minSelect > 0 && ` (En az ${group.minSelect} seçim zorunlu)`}
                                        </p>
                                    </div>
                                    {(isMet || product.setMenu?.setType === 'BUNDLE') && <i className="fat fa-check-circle text-emerald-500 text-2xl"></i>}
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {group.items.map((item, iIdx) => {
                                        const pName = allProducts.find(p => p.id === item.productId)?.name || 'Bilinmeyen Ürün';
                                        const isSelected = (selections[gIdx] || []).some(s => s.productId === item.productId);
                                        const isDisabled = !isSelected && currentSelCount >= group.maxSelect;
                                        
                                        return (
                                            <button 
                                                key={iIdx}
                                                onClick={() => !isDisabled && handleItemToggle(gIdx, item, group.maxSelect)}
                                                disabled={isDisabled && group.maxSelect > 1}
                                                className={`relative p-3 rounded-2xl border-2 text-left transition-all overflow-hidden ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 shadow-md scale-[1.02]' : isDisabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 shadow-sm'}`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <span className={`font-bold leading-tight ${isSelected ? 'text-indigo-800 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{pName}</span>
                                                    {isSelected && <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0 ml-2"><i className="fat fa-check text-[10px]"></i></div>}
                                                </div>
                                                <div className="flex justify-between items-end mt-2">
                                                    {item.priceDiff > 0 ? (
                                                        <div className={`text-xs font-black ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                            +₺{item.priceDiff}
                                                        </div>
                                                    ) : <div></div>}
                                                    {product.setMenu?.setType === 'BUNDLE' && (
                                                        <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight ${isSelected ? 'bg-orange-500 text-white' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                                                            {item.entitlementCost || 1} Hak
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center shrink-0">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Toplam Set Fiyatı</p>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">₺{product.price + extraPrice}</p>
                    </div>
                    <button 
                        onClick={handleConfirm}
                        disabled={!isConfirmEnabled()}
                        className={`px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center gap-2 transition-all shadow-lg ${isConfirmEnabled() ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/30 hover:scale-105 active:scale-95' : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'}`}
                    >
                        <i className="fat fa-cart-shopping"></i> Sepete Ekle
                    </button>
                </div>
            </div>
        </div>
    );
}
