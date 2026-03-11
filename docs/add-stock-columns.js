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

async function addProductStockColumns() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);

        console.log('Adding stock columns to products table...');
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE Name = N'costPrice' AND Object_ID = Object_ID(N'products')
            )
            BEGIN
                ALTER TABLE products ADD costPrice DECIMAL(10,2) NULL DEFAULT 0;
                PRINT 'costPrice added to products.';
            END

            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE Name = N'minStockLevel' AND Object_ID = Object_ID(N'products')
            )
            BEGIN
                ALTER TABLE products ADD minStockLevel DECIMAL(10,2) NULL DEFAULT 0;
                PRINT 'minStockLevel added to products.';
            END

            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE Name = N'unit' AND Object_ID = Object_ID(N'products')
            )
            BEGIN
                ALTER TABLE products ADD unit NVARCHAR(50) NULL DEFAULT 'adet';
                PRINT 'unit added to products.';
            END
        `);

        console.log('Columns created/verified successfully.');
        await pool.close();
    } catch (err) {
        console.error('Error adding stock columns:', err.message);
    }
}

addProductStockColumns();
