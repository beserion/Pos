const axios = require('axios');

async function test() {
    try {
        const loginRes = await axios.post('http://localhost:3050/auth/login', {
            username: 'admin',
            password: '123'
        });
        const token = loginRes.data.access_token;

        const config = { headers: { Authorization: `Bearer ${token}` } };

        console.log('Fetching products...');
        const prods = await axios.get('http://localhost:3050/products', config);
        console.log('Products:', prods.data.length);

        console.log('Fetching printers...');
        const printers = await axios.get('http://localhost:3050/printers', config);
        console.log('Printers:', printers.data.length);

        console.log('Success!');
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.error('Data:', e.response.data);
    }
}
test();
