'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl?: string;
}

export function PageClient() {
    const params = useParams();
    const tableId = params.tableId;
    const t = useTranslations('QRMenu');

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    const API_URL = 'http://localhost:3050';

    useEffect(() => {
        fetch(`${API_URL}/public/products`)
            .then(res => res.json())
            .then(data => {
                setProducts(data);
                const uniqueCategories = ['all', ...Array.from(new Set(data.map((p: Product) => p.category)))];
                setCategories(uniqueCategories as string[]);
            })
            .catch(err => console.error('Error fetching menu:', err))
            .finally(() => setLoading(false));
    }, []);

    const filteredProducts = products.filter(p => selectedCategory === 'all' || p.category === selectedCategory);

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans pb-20 selection:bg-indigo-100 dark:selection:bg-indigo-500/30">
            {/* Soft Corporate Header */}
            <div className="relative bg-white dark:bg-slate-900 px-6 pt-12 pb-20 rounded-b-[48px] shadow-[0_4px_20px_-1px_rgba(0,0,0,0.05)] dark:shadow-none border-b border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 dark:bg-purple-400/5 rounded-full -ml-16 -mb-16 blur-3xl"></div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none p-1 border border-slate-50 dark:border-slate-700 mx-auto">
                            <div className="w-full h-full bg-slate-900 dark:bg-white rounded-[14px] flex items-center justify-center text-white dark:text-slate-900">
                                <i className="fat fa-bolt-lightning text-3xl"></i>
                            </div>
                        </div>
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-[0.15em] leading-tight">
                        {t('title')}
                    </h1>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4">
                        Powered by PosNetX
                    </p>
                    <div className="flex items-center gap-3 px-5 py-2 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/20">
                        <span className="text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest">{t('table')}</span>
                        <div className="w-1.5 h-1.5 bg-indigo-200 dark:bg-indigo-800 rounded-full"></div>
                        <span className="text-indigo-900 dark:text-indigo-100 font-black text-sm">#{tableId}</span>
                    </div>
                </div>
            </div>

            {/* Categories - Refined Pills */}
            <div className="sticky top-0 z-40 px-4 -mt-8">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[24px] shadow-sm border border-slate-200/50 dark:border-slate-800/50 p-1.5 flex overflow-x-auto hide-scrollbar gap-1">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-6 py-2.5 rounded-[18px] whitespace-nowrap text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
                                selectedCategory === cat 
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-200 dark:shadow-none' 
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            {cat === 'all' ? t('all') : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Grid */}
            <div className="px-6 py-8">
                {loading ? (
                    <div className="flex flex-col justify-center items-center py-20 gap-4">
                        <div className="w-10 h-10 border-[3px] border-slate-100 dark:border-slate-800 border-t-slate-900 dark:border-t-white rounded-full animate-spin"></div>
                        <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">{t('loading')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="group bg-white dark:bg-slate-900 rounded-[28px] p-3.5 flex gap-4 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:border-indigo-500/30 transition-all duration-500">
                                {/* Image Container */}
                                <div className="relative w-24 h-24 rounded-[20px] bg-slate-50 dark:bg-slate-800/50 flex-shrink-0 overflow-hidden border border-slate-50 dark:border-slate-800">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center opacity-30 group-hover:opacity-50 transition-opacity">
                                            <i className="fat fa-bowl-food text-3xl text-slate-400"></i>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex flex-col flex-1 py-0.5">
                                    <div className="mb-1">
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base tracking-tight leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {product.name}
                                        </h3>
                                    </div>
                                    <p className="text-slate-400 dark:text-slate-500 text-[11px] line-clamp-2 leading-relaxed mb-3">
                                        {product.description || t('noDescription')}
                                    </p>
                                    <div className="mt-auto flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                {product.price}
                                            </span>
                                            <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">{t('priceSymbol')}</span>
                                        </div>
                                        <button className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 transition-all duration-300">
                                            <i className="fat fa-plus text-xs"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Footer */}
            <div className="mt-10 mb-6 flex flex-col items-center opacity-40">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <i className="fat fa-shield-check"></i>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                    {t('footer')}
                </p>
            </div>
        </div>
    );
}
