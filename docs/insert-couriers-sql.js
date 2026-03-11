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

async function insertCouriers() {
    try {
        await sql.connect(config);
        console.log("Connected to DB.");

        const couriers = [
            { firstName: 'Ahmet', lastName: 'Yılmaz', roleTitle: 'Kurye', phone: '05551112233', vehicleType: 'Motosiklet', licensePlate: '34 AB 123', courierStatus: 'AVAILABLE', isActive: 1 },
            { firstName: 'Mehmet', lastName: 'Kaya', roleTitle: 'Motor Kurye', phone: '05324445566', vehicleType: 'Motosiklet', licensePlate: '34 CD 456', courierStatus: 'BUSY', isActive: 1 },
            { firstName: 'Ayşe', lastName: 'Demir', roleTitle: 'Kurye', phone: '05447778899', vehicleType: 'Bisiklet', licensePlate: 'Yok', courierStatus: 'OFF_DUTY', isActive: 1 },
            { firstName: 'Ali', lastName: 'Veli', roleTitle: 'Kurye', phone: '05339990011', vehicleType: 'Araba', licensePlate: '06 XYZ 98', courierStatus: 'AVAILABLE', isActive: 1 }
        ];

        for (const c of couriers) {
            await sql.query(`
                INSERT INTO employees (firstName, lastName, roleTitle, phone, vehicleType, licensePlate, courierStatus, isActive, createdAt, updatedAt)
                VALUES (N'${c.firstName}', N'${c.lastName}', N'${c.roleTitle}', '${c.phone}', N'${c.vehicleType}', N'${c.licensePlate}', '${c.courierStatus}', ${c.isActive}, GETDATE(), GETDATE())
            `);
            console.log("Inserted:", c.firstName, c.lastName);
        }

        console.log("All couriers inserted successfully!");
        process.exit(0);
    } catch (err) {
        console.error("SQL Error:", err);
        process.exit(1);
    }
}
insertCouriers();
