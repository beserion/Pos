const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35',
    database: 'AntigravityPOS',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        await sql.connect(config);

        const query = `
        DECLARE @MerkezId INT = (SELECT TOP 1 id FROM locations WHERE name = 'Merkez Şube');
        DECLARE @SahilId INT = (SELECT TOP 1 id FROM locations WHERE name = 'Sahil Şube');

        -- Restore Courier Employees
        IF NOT EXISTS (SELECT 1 FROM employees WHERE firstName = 'Can' AND lastName = 'Arslan')
        BEGIN
            INSERT INTO [dbo].[employees] ([firstName], [lastName], [roleTitle], [phone], [isActive], [locationId], [vehicleType], [licensePlate], [courierStatus]) 
            VALUES ('Can', 'Arslan', 'Kurye', '0555 456 78 90', 1, @SahilId, 'Motosiklet', '34 AB 123', 'AVAILABLE');
        END

        IF NOT EXISTS (SELECT 1 FROM employees WHERE firstName = 'Bora' AND lastName = 'Yüksel')
        BEGIN
            INSERT INTO [dbo].[employees] ([firstName], [lastName], [roleTitle], [phone], [isActive], [locationId], [vehicleType], [licensePlate], [courierStatus]) 
            VALUES ('Bora', 'Yüksel', 'Kurye', '0532 999 88 77', 1, @MerkezId, 'Bisiklet', 'ECO-001', 'AVAILABLE');
        END

        SELECT COUNT(*) as courierCount FROM employees WHERE roleTitle = 'Kurye';
        `;

        const result = await sql.query(query);
        console.log("Couriers restored:", result.recordset);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sql.close();
    }
}

run();
