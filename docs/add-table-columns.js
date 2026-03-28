const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35',
    database: 'AntigravityPOS',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function addTableColumns() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);

        console.log('Adding waiterName and orderStartTime to tables...');
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE Name = N'waiterName' AND Object_ID = Object_ID(N'tables')
            )
            BEGIN
                ALTER TABLE tables ADD waiterName NVARCHAR(255) NULL;
                PRINT 'waiterName added to tables.';
            END

            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE Name = N'orderStartTime' AND Object_ID = Object_ID(N'tables')
            )
            BEGIN
                ALTER TABLE tables ADD orderStartTime DATETIME2(7) NULL;
                PRINT 'orderStartTime added to tables.';
            END
            
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE Name = N'printerId' AND Object_ID = Object_ID(N'products')
            )
            BEGIN
                ALTER TABLE products ADD printerId INT NULL;
                PRINT 'printerId added to products.';
            END
        `);

        await pool.close();
        console.log('Done.');
    } catch (err) {
        console.error('Error adding columns:', err.message);
    }
}

addTableColumns();
