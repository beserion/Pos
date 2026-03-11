const http = require('http');

function request(options, postData) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', (err) => reject(err));
        if (postData) {
            req.write(JSON.stringify(postData));
        }
        req.end();
    });
}

async function testLocations() {
    try {
        console.log('Testing Locations API...');

        // Login
        const loginData = await request({
            hostname: 'localhost',
            port: 3050,
            path: '/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { username: 'admin', password: 'adminpassword' });

        const token = loginData.access_token;
        console.log('Login successful.');

        // Get Locations
        const locations = await request({
            hostname: 'localhost',
            port: 3050,
            path: '/locations',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Locations count:', locations.length);
        console.log('Locations data:', JSON.stringify(locations, null, 2));

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testLocations();
