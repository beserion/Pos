'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

const languages = [
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' }
];

export default function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageChange = (newLocale: string) => {
        // More robust path replacement
        const segments = pathname.split('/');
        if (segments.length > 1 && languages.some(l => l.code === segments[1])) {
            segments[1] = newLocale;
        } else {
            segments.unshift('', newLocale);
        }
        const newPath = segments.join('/') || `/${newLocale}`;

        router.push(newPath);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95"
            >
                <span className="text-xl">{currentLanguage.flag}</span>
                <span className="font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-slate-300">
                    {currentLanguage.code}
                </span>
                <i className={`fat fa-chevron-down text-[10px] text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-slate-900 backdrop-blur-2xl border border-slate-200 dark:border-slate-700 rounded-[24px] shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="p-2 grid grid-cols-1 gap-1">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all ${locale === lang.code
                                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{lang.flag}</span>
                                    <span className="font-bold text-sm tracking-tight">{lang.name}</span>
                                </div>
                                {locale === lang.code && <i className="fat fa-check text-xs"></i>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
