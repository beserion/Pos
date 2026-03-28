const axios = require('axios');
const API_URL = 'http://localhost:3050';

async function testRolesAPI() {
    try {
        console.log('1. Logging in as Admin to get token...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@antigravity.com',
            password: '123456'
        });
        const token = loginRes.data.access_token;
        console.log('Login successful. Token:', token.substring(0, 15) + '...');

        const headers = { Authorization: `Bearer ${token}` };

        console.log('\n2. Fetching current roles...');
        const rolesRes = await axios.get(`${API_URL}/roles`, { headers });
        console.log('Roles found:', rolesRes.data.map(r => r.name));

        console.log('\n3. Creating a new test role: Müdür');
        const createRes = await axios.post(`${API_URL}/roles`, {
            name: 'Müdür',
            description: 'Mağaza Yöneticisi'
        }, { headers });
        console.log('Created Role:', createRes.data.name);

        console.log('\n4. Fetching roles again to verify addition...');
        const updatedRolesRes = await axios.get(`${API_URL}/roles`, { headers });
        console.log('Updated Roles List:', updatedRolesRes.data.map(r => r.name));

        console.log('\n5. Cleaning up (Deleting the test role)...');
        await axios.delete(`${API_URL}/roles/${createRes.data.id}`, { headers });
        console.log('Test Role deleted successfully.');

    } catch (error) {
        console.error('API Error:', error.response ? error.response.data : error.message);
    }
}

testRolesAPI();
