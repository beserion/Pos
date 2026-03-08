import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
    const t = useTranslations('Warehouses');
    const tc = useTranslations('Common');
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
        <div className="w-full flex-1 flex flex-col h-full overflow-hidden">
            <form onSubmit={onSave} id="xxxForm" className="flex flex-col h-full w-full">
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[420px]">
                        {/* Left: Form Fields */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelName')}</label>
                                <div className="relative">
                                    <i className="fat fa-tag absolute left-4 top-4 text-sky-500/50"></i>
                                    <input type="text" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-sky-500/10 outline-none transition-shadow" placeholder={t('labelName')} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{tc('linkedBranch')}</label>
                                <div className="relative">
                                    <i className="fat fa-building absolute left-4 top-4 text-sky-500/50"></i>
                                    <select value={formData.locationId || 0} onChange={(e) => setFormData({ ...formData, locationId: parseInt(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-sky-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                        <option value={0}>{tc('headquarters')}</option>
                                        {locations.map((loc) => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                    <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelLocation')}</label>
                                <div className="relative">
                                    <i className="fat fa-map-location-dot absolute left-4 top-4 text-sky-500/50"></i>
                                    <input type="text" value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-sky-500/10 outline-none transition-shadow" placeholder={t('labelLocation')} />
                                </div>
                            </div>

                            <div className="flex gap-4 px-1 pt-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Enlem: <span className="text-sky-600 font-mono">{formData.latitude?.toFixed(6) || '-'}</span></p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Boylam: <span className="text-sky-600 font-mono">{formData.longitude?.toFixed(6) || '-'}</span></p>
                            </div>
                        </div>

                        {/* Right: Map */}
                        <div className="flex flex-col h-full">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelLocation')} (Harita)</label>
                            <div className="flex-1 min-h-[340px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner relative z-0">
                                <MapContainer center={position || [40.7663, 29.9175]} zoom={13} style={{ height: '100%', width: '100%', minHeight: '340px' }}>
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    <LocationMarker position={position} setPosition={setPosition} setFormData={setFormData} formData={formData} />
                                </MapContainer>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 flex justify-between h-[100px] items-center">
                    <button type="button" onClick={onClose} className="w-[200px] py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                        <i className="fat fa-xmark text-lg"></i> {tc('cancel')}
                    </button>
                    <button type="submit" className="w-[200px] py-4 bg-gradient-to-r from-sky-600 to-sky-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-sky-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                        <i className="fat fa-check text-lg"></i> {tc('save')}
                    </button>
                </div>
            </form>
        </div>
    );
}
