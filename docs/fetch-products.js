async function run() {
    try {
        const loginRes = await fetch('http://localhost:3050/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@antigravity.com',
                password: '123456'
            })
        });
        const loginData = await loginRes.json();
        const token = loginData.access_token || loginData.token;
        
        const prodRes = await fetch('http://localhost:3050/products', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const products = await prodRes.json();
        
        console.log(JSON.stringify(products.map(p => ({ id: p.id, name: p.name, imageUrl: p.imageUrl })), null, 2));
    } catch (error) {
        console.error('Error fetching products:', error.message);
    }
}

run();
