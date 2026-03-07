const axios = require('axios');

async function testSave() {
    try {
        // Login first
        const loginRes = await axios.post('http://localhost:3050/auth/login', {
            email: 'admin@admin.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log('Logged in!');

        // Try to create a printer
        console.log('Testing Create Printer...');
        const createRes = await axios.post('http://localhost:3050/printers', {
            name: 'Test Printer',
            location: 'Test Location',
            printerName: 'Windows Test Name',
            ipAddress: '127.0.0.1',
            isActive: true
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Create Success:', createRes.data);

        // Try to update it
        const id = createRes.data.id;
        console.log('Testing Update Printer ID:', id);
        const updateRes = await axios.put(`http://localhost:3050/printers/${id}`, {
            name: 'Test Printer Updated',
            printerName: 'Windows Test Name Updated'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Update Success:', updateRes.data);

        // Delete test printer
        await axios.delete(`http://localhost:3050/printers/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Delete Success');

    } catch (error) {
        console.error('FAILED!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
        process.exit(1);
    }
}

testSave();
