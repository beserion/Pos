const axios = require('axios');

async function testLocations() {
    try {
        console.log('Testing Locations API...');

        // Login to get token
        const loginRes = await axios.post('http://localhost:3050/auth/login', {
            username: 'admin',
            password: 'adminpassword'
        });

        const token = loginRes.data.access_token;
        console.log('Login successful, token acquired.');

        const config = { headers: { Authorization: `Bearer ${token}` } };

        // Get Locations
        const locationsRes = await axios.get('http://localhost:3050/locations', config);
        console.log('Locations count:', locationsRes.data.length);
        console.log('Locations data:', JSON.stringify(locationsRes.data, null, 2));

    } catch (error) {
        console.error('Test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Message:', error.message);
        }
    }
}

testLocations();
