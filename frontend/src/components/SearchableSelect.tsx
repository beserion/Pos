'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = "Seçiniz",
    icon,
    disabled = false
}: {
    value: any;
    onChange: (val: any) => void;
    options: { value: any, label: string, disabled?: boolean }[];
    placeholder?: string;
    icon?: string;
    disabled?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [coords, setCoords] = useState<{ top: number, left: number, width: number } | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null); // New ref for the portal menu
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleClickOutside = (event: MouseEvent) => {
            // Check if click was inside toggle OR inside the portal menu
            const isClickInsideToggle = wrapperRef.current?.contains(event.target as Node);
            const isClickInsideMenu = menuRef.current?.contains(event.target as Node);
            
            if (!isClickInsideToggle && !isClickInsideMenu) {
                setIsOpen(false);
            }
        };

        const handleScrollOrResize = (e: any) => {
            // Only close if scroll is NOT inside our menu
            if (menuRef.current?.contains(e.target)) return;
            setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScrollOrResize, true);
            window.addEventListener('resize', handleScrollOrResize);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen]);

    // Calculate position when opening or when window changes
    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom, // Use viewport coordinates for fixed positioning
                left: rect.left,
                width: rect.width
            });
        }
    }, [isOpen]);

    const filteredOptions = options.filter(opt => 
        opt.label?.toString().toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'))
    );

    const selectedOption = options.find(opt => opt.value === value);

    const menuContent = (
        <div 
            ref={menuRef}
            style={{ 
                position: 'fixed', // Fixed ignores all parent clipping
                top: (coords?.top || 0) + 8, 
                left: coords?.left || 0, 
                width: coords?.width || 0 
            }}
            className="z-[99999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-2 border-b border-slate-100 dark:border-slate-700 relative">
                <i className="fat fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 mt-0.5"></i>
                <input
                    autoFocus
                    type="text"
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl text-sm outline-none text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-teal-500/30"
                    placeholder="Arama yap..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <ul className="max-h-56 overflow-auto py-1 custom-scrollbar">
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt, idx) => (
                        <li
                            key={idx}
                            className={`px-4 py-2.5 text-sm font-bold transition-colors ${opt.disabled ? 'opacity-50 cursor-not-allowed text-slate-400' : `cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 ${value === opt.value ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}`}
                            onClick={() => {
                                if (opt.disabled) return;
                                onChange(opt.value);
                                setIsOpen(false);
                                setSearch('');
                            }}
                        >
                            {opt.label}
                        </li>
                    ))
                ) : (
                    <li className="px-4 py-6 text-center text-sm font-bold text-slate-400 opacity-70">
                        <i className="fat fa-magnifying-glass-minus text-2xl mb-2 block"></i>
                        Sonuç bulunamadı
                    </li>
                )}
            </ul>
        </div>
    );

    return (
        <div ref={wrapperRef} className="relative w-full">
            {icon && <i className={`${icon} absolute left-4 top-1/2 -translate-y-1/2 text-teal-500/50 z-10 pointer-events-none`}></i>}
            <div
                className={`w-full ${icon ? 'pl-12' : 'pl-4'} pr-10 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus-within:ring-4 focus-within:ring-teal-500/10 outline-none transition-shadow cursor-pointer flex items-center justify-between min-h-[52px] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`truncate ${selectedOption ? '' : 'text-slate-400'}`}>{selectedOption ? selectedOption.label : placeholder}</span>
                <i className={`fat fa-chevron-down text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </div>
            
            {isOpen && !disabled && mounted && coords && createPortal(menuContent, document.body)}
        </div>
    );
}


