
const axios = require('axios');

async function verify() {
    try {
        console.log('--- Logging in ---');
        const loginRes = await axios.post('http://localhost:3050/auth/login', {
            email: 'admin@antigravity.com',
            password: '123456'
        });
        const token = loginRes.data.access_token;
        console.log('Login successful, token obtained.\n');

        const authHeader = { headers: { Authorization: \Bearer \\ } };
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
                const res = await axios.get(\http://localhost:3050/\\, authHeader);
                console.log(\? \: \ records found\);
            } catch (err) {
                console.log(\? \: Error - \\);
            }
        }
    } catch (err) {
        console.error('Fatal error during verification:', err.message);
    }
}

verify();

