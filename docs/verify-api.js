async function verify() {
    try {
        console.log('--- Logging in ---');
        const loginRes = await fetch('http://localhost:3050/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@antigravity.com',
                password: '123456'
            })
        });

        const loginData = await loginRes.json();
        const token = loginData.access_token;

        if (!token) {
            console.error('Login failed:', loginData);
            return;
        }

        console.log('Login successful, token obtained.\n');

        const authHeader = { Authorization: `Bearer ${token}` };
        const endpoints = [
            'users',
            'roles',
            'products',
            'stocks',
            'sales',
            'invoices',
            'deliveries',
            'locations',
            'tables',
            'employees',
            'zones',
            'partners'
        ];

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(`http://localhost:3050/${endpoint}`, { headers: authHeader });
                const data = await res.json();
                console.log(`✅ ${endpoint.padEnd(12)}: ${data.length} records found`);
            } catch (err) {
                console.log(`❌ ${endpoint.padEnd(12)}: Error - ${err.message}`);
            }
        }

        console.log('\n--- Verification Finished ---');
    } catch (err) {
        console.error('Fatal error during verification:', err.message);
    }
}

verify();
