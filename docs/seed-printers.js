const axios = require('axios');

async function seedPrinters() {
    const printers = [
        { name: 'Mutfak Sıcak', ipAddress: '192.168.1.101', isActive: true },
        { name: 'Barmen', ipAddress: '192.168.1.102', isActive: true },
        { name: 'Adisyon (Kasa)', ipAddress: '192.168.1.103', isActive: true },
        { name: 'Soğuk İçecek Standı', ipAddress: '192.168.1.104', isActive: true }
    ];

    for (const p of printers) {
        try {
            await axios.post('http://localhost:3050/printers', p);
            console.log('Inserted printer:', p.name);
        } catch (e) {
            console.error('Error inserting printer:', p.name, e.response ? e.response.data : e.message);
        }
    }
}

seedPrinters();
