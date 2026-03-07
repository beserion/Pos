const axios = require('axios');

async function testKitchenOrders() {
    try {
        console.log('Logging in to get token...');
        const loginRes = await axios.post('http://localhost:3050/auth/login', {
            email: 'admin@antigravity.com',
            password: '123456'
        });
        const token = loginRes.data.access_token;
        console.log('Token obtained.');

        console.log('Fetching kitchen orders...');
        const res = await axios.get('http://localhost:3050/orders/kitchen', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`Success! Status: ${res.status}`);
        console.log(`Returned data length: ${res.data.length}`);
    } catch (err) {
        if (err.response) {
            console.error(`Error ${err.response.status}:`, err.response.data);
        } else {
            console.error('Request failed:', err.message);
        }
    }
}

testKitchenOrders();
