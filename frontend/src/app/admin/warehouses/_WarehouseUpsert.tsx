'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });

function LocationMarker({ position, setPosition, setFormData, formData }: any) {
    const { useMapEvents } = require('react-leaflet');
    useMapEvents({
        click(e: any) {
            const { lat, lng } = e.latlng;
            setPosition([lat, lng]);
            setFormData({ ...formData, latitude: lat, longitude: lng });
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

interface Location {
    id: number;
    name: string;
}

interface WarehouseUpsertProps {
    formData: any;
    setFormData: (data: any) => void;
    locations: Location[];
    onSave: (e: React.FormEvent) => void;
    onClose: () => void;
}

export default function WarehouseUpsert({ formData, setFormData, locations, onSave, onClose }: WarehouseUpsertProps) {
    const [position, setPosition] = useState<[number, number] | null>(
        formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : [40.7663, 29.9175]
    );

    useEffect(() => {
        // Fix for Leaflet marker icons in Next.js
        import('leaflet').then((L) => {
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            });
        });
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-5xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase">
                            <i className="fat fa-warehouse text-amber-600"></i>
                            {formData.id === 0 ? 'YENİ DEPO KAYDI' : 'DEPO BİLGİLERİNİ DÜZENLE'}
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Stok merkezi konum ve şube eşlemesini yapın</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                </div>

                <form onSubmit={onSave} className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Form Fields */}
                        <div className="lg:col-span-5 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Depo Adı</label>
                                <div className="relative">
                                    <i className="fat fa-tag absolute left-4 top-3.5 text-amber-500/50"></i>
                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-amber-500/10 outline-none transition-shadow" placeholder="Örn: Ana Stok Deposu" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Bağlı Olduğu Şube</label>
                                <div className="relative">
                                    <i className="fat fa-building absolute left-4 top-4 text-amber-500/50"></i>
                                    <select value={formData.locationId || 0} onChange={(e) => setFormData({ ...formData, locationId: parseInt(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-amber-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                        <option value={0}>Şube Seçilmedi (Merkez)</option>
                                        {locations.map((loc) => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                    <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Adres Bilgisi</label>
                                <div className="relative">
                                    <i className="fat fa-map-location-dot absolute left-4 top-4 text-amber-500/50"></i>
                                    <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-amber-500/10 outline-none transition-shadow" rows={3} placeholder="Açık adres yazınız..."></textarea>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Enlem (Lat)</label>
                                    <input type="text" readOnly value={formData.latitude?.toFixed(6) || ''} className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 font-mono text-xs outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Boylam (Lng)</label>
                                    <input type="text" readOnly value={formData.longitude?.toFixed(6) || ''} className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 font-mono text-xs outline-none" />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-500/10">
                                <i className="fat fa-circle-info text-amber-600 text-lg"></i>
                                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-tight uppercase tracking-wider">
                                    Depo konumunu belirlemek için sağdaki harita üzerinden seçim yapabilirsiniz.
                                </p>
                            </div>
                        </div>

                        {/* Map Picker */}
                        <div className="lg:col-span-7 flex flex-col h-full min-h-[400px]">
                            <div className="flex-1 rounded-[32px] overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner relative z-0">
                                <MapContainer center={position || [40.7663, 29.9175]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    <LocationMarker position={position} setPosition={setPosition} setFormData={setFormData} formData={formData} />
                                </MapContainer>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-10 py-4 rounded-[20px] border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-black text-xs uppercase tracking-widest transition-all">
                            VAZGEÇ
                        </button>
                        <button type="submit" className="px-12 py-4 rounded-[20px] bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/20 scale-100 hover:scale-[1.02] active:scale-95 transition-all">
                            DEPOYU KAYDET
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
