const axios = require('axios');

async function checkApi() {
    try {
        // Try multiple passwords just in case
        let token = null;
        for (const pwd of ['123', '123456', 'admin', 'password']) {
            try {
                const loginStr = await axios.post('http://localhost:3050/auth/login', { username: 'admin', password: pwd });
                if (loginStr.data && loginStr.data.access_token) {
                    token = loginStr.data.access_token;
                    break;
                }
            } catch (e) {
                // Ignore auth failures
            }
        }

        if (!token) {
            console.log("Could not login.");
            // If we can't login, just ping an unprotected endpoint
            return;
        }

        const config = { headers: { Authorization: `Bearer ${token}` } };
        console.log("Logged in!");

        try {
            console.log("Fetching /products...");
            const prods = await axios.get('http://localhost:3050/products', config);
            console.log(`Success! Found ${prods.data.length} products.`);
        } catch (e) {
            console.error("Products error:", e.response ? e.response.data : e.message);
        }

        try {
            console.log("Fetching /printers...");
            const printers = await axios.get('http://localhost:3050/printers', config);
            console.log(`Success! Found ${printers.data.length} printers.`);
        } catch (e) {
            console.error("Printers error:", e.response ? e.response.data : e.message);
        }

    } catch (e) {
        console.error(e.message);
    }
}
checkApi();
