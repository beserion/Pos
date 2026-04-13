// Global POS veri ön-belleği
// BusinessDayGuard kontrol yaparken eşzamanlı olarak POS verilerini çeker
// View mount edildiğinde cache'ten okur → API beklemeden anında render

export interface PrefetchedPosData {
    products: any[] | null;
    departments: any[] | null;
    productTypes: any[] | null;
    parentGroups: any[] | null;
    zones: any[] | null;
    tables: any[] | null;
    quicksaleProducts: any[] | null;
    parameters: any[] | null;
    timestamp: number;
}

const CACHE_TTL = 30_000; // 30 saniye

let _prefetchCache: PrefetchedPosData | null = null;
let _prefetchPromise: Promise<PrefetchedPosData> | null = null;

export function getPrefetchedData(): PrefetchedPosData | null {
    if (_prefetchCache && Date.now() - _prefetchCache.timestamp < CACHE_TTL) {
        return _prefetchCache;
    }
    return null;
}

export function getPrefetchPromise(): Promise<PrefetchedPosData> | null {
    return _prefetchPromise;
}

export function startPrefetch(apiUrl: string, token: string): Promise<PrefetchedPosData> {
    // Zaten devam eden bir prefetch varsa onu döndür
    if (_prefetchPromise) return _prefetchPromise;

    // Cache hala geçerliyse direkt döndür
    if (_prefetchCache && Date.now() - _prefetchCache.timestamp < CACHE_TTL) {
        return Promise.resolve(_prefetchCache);
    }

    const headers = { Authorization: `Bearer ${token}` };

    _prefetchPromise = Promise.all([
        fetch(`${apiUrl}/products`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${apiUrl}/departments`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${apiUrl}/product-types`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${apiUrl}/parent-groups`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${apiUrl}/zones`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${apiUrl}/tables`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${apiUrl}/products/quicksale`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${apiUrl}/parameters`, { headers }).then(r => r.json()).catch(() => []),
    ]).then(([products, departments, productTypes, parentGroups, zones, tables, quicksaleProducts, parameters]) => {
        const data: PrefetchedPosData = {
            products: Array.isArray(products) ? products : [],
            departments: Array.isArray(departments) ? departments : [],
            productTypes: Array.isArray(productTypes) ? productTypes : [],
            parentGroups: Array.isArray(parentGroups) ? parentGroups : [],
            zones: Array.isArray(zones) ? zones : [],
            tables: Array.isArray(tables) ? tables : [],
            quicksaleProducts: Array.isArray(quicksaleProducts) ? quicksaleProducts : [],
            parameters: Array.isArray(parameters) ? parameters : [],
            timestamp: Date.now(),
        };
        _prefetchCache = data;
        _prefetchPromise = null;
        return data;
    }).catch(() => {
        _prefetchPromise = null;
        return {
            products: null, departments: null, productTypes: null,
            parentGroups: null, zones: null, tables: null,
            quicksaleProducts: null, parameters: null, timestamp: 0,
        };
    });

    return _prefetchPromise;
}

export function invalidatePrefetchCache() {
    _prefetchCache = null;
    _prefetchPromise = null;
}
