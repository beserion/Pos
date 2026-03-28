'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        // Client-side redirect to Turkish login
        router.push('/tr/login');
    }, [router]);

    return (
        <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
            {/* Loading state to hide white flash */}
        </div>
    );
}
