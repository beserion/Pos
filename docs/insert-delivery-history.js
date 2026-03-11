const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'YourStrong@Passw0rd',
    server: 'localhost',
    database: 'AntigravityPOS',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function insertDeliveryHistory() {
    try {
        await sql.connect(config);
        console.log("Connected to DB.");

        // Önce kuryeleri bulalım
        const result = await sql.query(`SELECT id, firstName, lastName FROM employees WHERE roleTitle LIKE '%Kurye%'`);
        const couriers = result.recordset;

        if (couriers.length === 0) {
            console.log("Hiç kurye bulunamadı.");
            process.exit(0);
        }

        const statuses = ['DELIVERED', 'CANCELLED', 'IN_TRANSIT', 'PENDING'];
        const addresses = [
            'Kadıköy, Moda Caddesi No:12',
            'Beşiktaş, Barbaros Bulvarı No:45',
            'Şişli, Mecidiyeköy Yolu No:8',
            'Üsküdar, Sahil Yolu No:22',
            'Ataşehir, Atatürk Bulvarı No:11'
        ];

        let saleIdCounter = 1000;

        // Her kuryeye rastgele 3-4 adet geçmiş ekleyelim
        for (const courier of couriers) {
            const historyCount = Math.floor(Math.random() * 3) + 2; // 2 ile 4 arası kayıt
            for (let i = 0; i < historyCount; i++) {
                const saleId = saleIdCounter++;
                const status = statuses[Math.floor(Math.random() * statuses.length)];
                const address = addresses[Math.floor(Math.random() * addresses.length)];

                // Rasgele geçmiş bir tarih uyduralım (Son 1 hafta içinde)
                const daysAgo = Math.floor(Math.random() * 7);
                const hoursAgo = Math.floor(Math.random() * 24);

                await sql.query(`
                    INSERT INTO deliveries (saleId, courierId, status, deliveryAddress, createdAt, updatedAt)
                    VALUES (${saleId}, ${courier.id}, '${status}', N'${address}', DATEADD(hour, -${hoursAgo}, DATEADD(day, -${daysAgo}, GETDATE())), GETDATE())
                `);

            }
            console.log(`Inserted ${historyCount} history records for ${courier.firstName} ${courier.lastName}`);
        }

        console.log("All delivery history records inserted successfully!");
        process.exit(0);
    } catch (err) {
        console.error("SQL Error:", err);
        process.exit(1);
    }
}
insertDeliveryHistory();
