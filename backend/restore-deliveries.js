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
        -- Restore Deliveries
        IF (SELECT COUNT(*) FROM deliveries) = 0
        BEGIN
            -- We need some sales and couriers
            DECLARE @CourierId INT = (SELECT TOP 1 id FROM employees WHERE roleTitle = 'Kurye');
            
            -- Insert sample deliveries for existing sales or dummy sales if needed
            -- For simplicity, let's just insert based on existing sample logic if sales exist
            IF EXISTS (SELECT 1 FROM sales)
            BEGIN
                INSERT INTO [deliveries] ([saleId], [courierId], [status], [deliveryAddress], [createdAt], [updatedAt])
                SELECT TOP 5 id, @CourierId, 'DELIVERED', 'Test Adresi ' + CAST(id as varchar), GETDATE(), GETDATE()
                FROM sales;
                
                PRINT 'Deliveries restored linked to sales.';
            END
            ELSE
            BEGIN
                PRINT 'No sales found to link deliveries.';
            END
        END
        ELSE
        BEGIN
            PRINT 'Deliveries already exist.';
        END

        SELECT COUNT(*) as deliveryCount FROM deliveries;
        `;

        const result = await sql.query(query);
        console.log("Deliveries checked:", result.recordset);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sql.close();
    }
}

run();
