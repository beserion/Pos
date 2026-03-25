async function checkProducts() {
    try {
        // PIN Only Login (Waiters/Admins use PIN 1234)
        const loginRes = await fetch('http://localhost:3050/auth/login-pin-only', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pinCode: '1234' })
        });
        const loginData = await loginRes.json();
        const token = loginData.access_token;

        if (!token) {
            console.error('Login Data:', loginData);
            throw new Error('PIN Login failed');
        }

        // Fetch products
        const response = await fetch('http://localhost:3050/products', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log('Total Products:', data.length);
        console.log('Sample Image URLs:');
        data.slice(0, 30).forEach(p => {
            console.log(`- ${p.name} (ID: ${p.id}): ${p.imageUrl}`);
        });
    } catch (e) {
        console.error('API Error:', e.message);
    }
}

checkProducts();
