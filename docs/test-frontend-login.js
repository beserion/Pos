const axios = require('axios');

async function testFrontendLogin() {
    try {
        console.log('Hitting http://127.0.0.1:3050/auth/login');
        const res = await axios.post('http://127.0.0.1:3050/auth/login', {
            email: 'admin@antigravity.com',
            password: '123456'
        });
        console.log('SUCCESS! Token:', res.data.access_token);
        console.log('User:', res.data.user);
    } catch (err) {
        if (err.response) {
            console.error(`ERROR ${err.response.status}:`, err.response.data);
        } else {
            console.error('NETWORK ERROR:', err.message);
        }
    }
}

testFrontendLogin();
