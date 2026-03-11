const axios = require('axios');

async function test() {
    try {
        console.log('Attempting login...');
        const loginRes = await axios.post('http://localhost:3050/auth/login', {
            email: 'admin@example.com',
            password: 'password123'
        });

        const token = loginRes.data.access_token;
        console.log('Login successful, token received.');

        console.log('Fetching locations...');
        const locationsRes = await axios.get('http://localhost:3050/locations', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Success! Locations count:', locationsRes.data.length);
        console.log('Data:', JSON.stringify(locationsRes.data, null, 2));
    } catch (error) {
        console.error('Error during API test:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Message:', error.message);
        }
    }
}

test();
