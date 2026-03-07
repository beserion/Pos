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

            <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-4 rounded-[20px] border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-black text-xs uppercase tracking-widest transition-all">
                    VAZGEÇ
                </button>
                <button type="submit" className="flex-[2] py-4 rounded-[20px] bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/20 scale-100 hover:scale-[1.02] active:scale-95 transition-all">
                    DEPOYU KAYDET
                </button>
            </div>
        </form>
            </div >
        </div >
    );
}
