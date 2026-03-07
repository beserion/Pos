async function test() {
    try {
        const loginRes = await fetch('http://localhost:3050/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@antigravity.com', password: '123456' })
        });
        const loginData = await loginRes.json();
        const token = loginData.access_token;
        const headers = { Authorization: `Bearer ${token}` };

        console.log("Testing /partners...");
        const pRes = await fetch('http://localhost:3050/partners', { headers });
        console.log("Status:", pRes.status);
        if (!pRes.ok) console.error("Error:", await pRes.text());

        console.log("Testing /finance/transactions...");
        const fRes = await fetch('http://localhost:3050/finance/transactions', { headers });
        console.log("Status:", fRes.status);
        if (!fRes.ok) console.error("Error:", await fRes.text());

        console.log("Testing /finance/summary...");
        const sRes = await fetch('http://localhost:3050/finance/summary', { headers });
        console.log("Status:", sRes.status);
        if (!sRes.ok) console.error("Error:", await sRes.text());
    } catch (e) {
        console.error("Test failed:", e.message);
    }
}
test();
