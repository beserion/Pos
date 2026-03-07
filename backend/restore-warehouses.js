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

        // Restore Locations first (if missing, though we saw 2 earlier)
        // Then Warehouses
        const query = `
        IF NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Merkez Şube')
        BEGIN
            INSERT INTO locations (name, address, phone, isActive, createdAt, updatedAt)
            VALUES ('Merkez Şube', 'Kadıköy, İstanbul', '0216 111 22 33', 1, GETDATE(), GETDATE());
        END
        
        IF NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Sahil Şube')
        BEGIN
            INSERT INTO locations (name, address, phone, isActive, createdAt, updatedAt)
            VALUES ('Sahil Şube', 'Beşiktaş, İstanbul', '0212 444 55 66', 1, GETDATE(), GETDATE());
        END

        DECLARE @MerkezId INT = (SELECT TOP 1 id FROM locations WHERE name = 'Merkez Şube');
        DECLARE @SahilId INT = (SELECT TOP 1 id FROM locations WHERE name = 'Sahil Şube');

        IF (SELECT COUNT(*) FROM Warehouses) = 0
        BEGIN
            INSERT INTO Warehouses (name, address, latitude, longitude, isActive, locationId)
            VALUES 
            ('Ana Depo - Merkez', 'Kadıköy Nakliye Durağı No:12', 40.9901, 29.0234, 1, @MerkezId),
            ('Yedek Depo - Beşiktaş', 'Barbaros Bulvarı No:44', 41.0422, 29.0075, 1, @SahilId);
            
            PRINT 'Warehouses restored.';
        END
        ELSE
        BEGIN
            PRINT 'Warehouses already exist.';
        END
        `;

        const result = await sql.query(query);
        console.log("Result:", result);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sql.close();
    }
}

run();
