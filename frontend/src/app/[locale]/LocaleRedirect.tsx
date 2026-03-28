'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function LocaleRedirect({ locale }: { locale: string }) {
    const router = useRouter();

    useEffect(() => {
        router.replace(`/${locale}/login`);
    }, [locale, router]);

    return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-900 border-indigo-500">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
    );
}
