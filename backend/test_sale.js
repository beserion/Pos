const axios = require('axios');
async function run() {
    try {
        const res = await axios.post('http://localhost:3050/sales', {
            totalAmount: 10,
            paymentMethod: 'CASH',
            cashRegisterId: null,
            shiftId: null,
            status: 'COMPLETED',
            tableName: 'QUICKSALE',
            description: 'Perakende Müşteri',
            waiterId: 1,
            items: [{
                productId: 1,
                quantity: 1,
                unitPrice: 10,
                total: 10
            }]
        });
        console.log(res.data);
    } catch (err) {
        if (err.response) {
            console.error('Error status:', err.response.status);
            console.error('Error data:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('Error message:', err.message);
        }
    }
}
run();
