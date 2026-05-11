const fs = require('fs');
const file = 'frontend/src/app/[locale]/sales/PageClient.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 =     useEffect(() => {
        if (!loading && !user) router.push(\/\/login\);
        if (user) fetchSales();
    }, [user, loading, filterDate, page]);;

const repl1 =     useEffect(() => {
        if (!loading && !user) router.push(\/\/login\);
        if (user) fetchSales();
    }, [user, loading, filterDate, page]);

    useEffect(() => {
        const fetchStatus = async () => {
            if (user) {
                try {
                    const token = localStorage.getItem('token') || (user)?.token;
                    const res = await fetch(\\/business-day/status\, {
                        headers: { Authorization: \Bearer \\ }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.activeBusinessDate && filterDate === new Date().toISOString().split('T')[0]) {
                            setFilterDate(data.activeBusinessDate);
                        }
                    }
                } catch (e) {
                    console.error('Error fetching business day status:', e);
                }
            }
        };
        fetchStatus();
    }, [user]);;

content = content.replace(target1, repl1);
fs.writeFileSync(file, content);
console.log('Done');
