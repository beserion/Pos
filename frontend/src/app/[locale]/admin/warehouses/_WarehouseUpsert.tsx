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
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                            <i className="fat fa-warehouse text-sky-600"></i>
                            {formData.id === 0 ? 'YENİ DEPO KAYDI' : 'DEPO BİLGİLERİNİ DÜZENLE'}
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">Stok merkezi konum ve şube eşlemesini yapın</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                </div>

                <form onSubmit={onSave} className="flex-1 overflow-y-auto p-8">
                    <div className="text-start w-100">
                        <div className="row mp-0 g-2">
                            <div className="col-md-6 mb-2">
                                <div className="input-group">
                                    <div className="input-group-text wd-130 font-bold"><span>Depo Adı <span className="text-danger">*</span></span></div>
                                    <input type="text" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-control" placeholder="Örn: Ana Stok Deposu" />
                                    <div className="input-group-text wd-50"><i className="fat fa-tag"></i></div>
                                </div>
                            </div>

                            <div className="col-md-6 mb-2">
                                <div className="input-group">
                                    <div className="input-group-text wd-130 font-bold"><span>Bağlı Şube</span></div>
                                    <select value={formData.locationId || 0} onChange={(e) => setFormData({ ...formData, locationId: parseInt(e.target.value) })} className="form-select">
                                        <option value={0}>Şube Seçilmedi (Merkez)</option>
                                        {locations.map((loc) => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                    <div className="input-group-text wd-50"><i className="fat fa-building"></i></div>
                                </div>
                            </div>

                            <div className="col-12 mb-2">
                                <div className="input-group">
                                    <div className="input-group-text wd-130 font-bold"><span>Adres Bilgisi</span></div>
                                    <input type="text" value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="form-control" placeholder="Açık adres yazınız..." />
                                    <div className="input-group-text wd-50"><i className="fat fa-map-location-dot"></i></div>
                                </div>
                            </div>

                            <div className="col-12 mb-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Konum Seçimi (Harita üzerinde tıklayın)</p>
                                <div className="h-64 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner relative z-0">
                                    <MapContainer center={position || [40.7663, 29.9175]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        />
                                        <LocationMarker position={position} setPosition={setPosition} setFormData={setFormData} formData={formData} />
                                    </MapContainer>
                                </div>
                                <div className="flex gap-4 mt-2 px-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Enlem: <span className="text-sky-600">{formData.latitude?.toFixed(6) || '-'}</span></p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Boylam: <span className="text-sky-600">{formData.longitude?.toFixed(6) || '-'}</span></p>
                                </div>
                            </div>
                        </div>

                        <hr className="my-2" />
                        <div className="d-flex justify-content-between align-items-center">
                            <button type="button" className="btn btn-soft-danger btn-label border" onClick={onClose}>
                                <i className="fas fa-times label-icon"></i> İptal
                            </button>
                            <button type="submit" className="btn btn-soft-success btn-label border">
                                <i className="fas fa-save label-icon"></i> Kaydet
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
