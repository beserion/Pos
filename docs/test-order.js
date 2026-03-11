const axios = require('axios');

async function testOrder() {
    try {
        // 1. Get token by logging in as Test Admin (id: 1, pin: 1234)
        const loginRes = await axios.post('http://localhost:3050/auth/login-pin', {
            userId: 1,
            pinCode: '1234'
        });
        const token = loginRes.data.access_token;
        console.log("Logged in successfully. Token received.");

        // 2. Create an order on Table 1
        const orderData = {
            table: { id: 1 },
            waiter: { id: 1 },
            items: [
                { product: { id: 1 }, quantity: 2, price: 150 }
            ],
            totalAmount: 300,
            status: 'NEW'
        };

        console.log("Sending order payload to /orders...");
        const orderRes = await axios.post('http://localhost:3050/orders', orderData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Order created successfully:", orderRes.data);
    } catch (err) {
        if (err.response) {
            console.error("HTTP ERROR:", err.response.status, err.response.data);
        } else {
            console.error("NETWORK ERROR:", err.message);
        }
    }
}

testOrder();
