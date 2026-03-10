'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl?: string;
}

export default function QRMenuPage() {
    const params = useParams();
    const tableId = params.tableId; // optionally, fetch table info or check table existence

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
    const [loading, setLoading] = useState(true);

    const API_URL = 'http://localhost:3050';

    useEffect(() => {
        fetch(`${API_URL}/public/products`)
            .then(res => res.json())
            .then(data => {
                setProducts(data);
                const uniqueCategories = ['Tümü', ...Array.from(new Set(data.map((p: Product) => p.category)))];
                setCategories(uniqueCategories as string[]);
            })
            .catch(err => console.error('Error fetching menu:', err))
            .finally(() => setLoading(false));
    }, []);

    const filteredProducts = products.filter(p => selectedCategory === 'Tümü' || p.category === selectedCategory);

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* Header Area */}
            <div className="bg-indigo-600 text-white rounded-b-[40px] pt-12 pb-16 px-6 relative shadow-xl overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-600/30"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <h1 className="text-3xl font-black mb-2 tracking-tight">Dijital Menü</h1>
                    <p className="text-indigo-100 text-sm">Masada oturuyorsunuz: #{tableId}</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="-mt-10 px-4 relative z-20">
                <div className="bg-white rounded-2xl shadow-lg p-2 flex overflow-x-auto hide-scrollbar gap-2 mb-6 border border-slate-100">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-5 py-2.5 rounded-xl whitespace-nowrap text-sm font-bold transition-all flex-none ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 bg-slate-50 hover:bg-slate-100'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="bg-white rounded-[24px] p-3 flex gap-4 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                                <div className="w-24 h-24 rounded-2xl bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-50">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl opacity-30">🍽️</span>
                                    )}
                                </div>
                                <div className="flex flex-col justify-center flex-1">
                                    <h3 className="font-bold text-slate-800 text-base leading-tight mb-1">{product.name}</h3>
                                    <p className="text-slate-500 text-xs line-clamp-2 mb-2 min-h-[2.5rem]">{product.description || 'Nefis lezzet'}</p>
                                    <div className="mt-auto">
                                        <span className="font-black text-indigo-600 text-lg">₺{product.price}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-10 text-center text-slate-400 text-xs">
                Menü Sistemi by PosNetX
            </div>
        </div>
    );
}
