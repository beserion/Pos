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

async function fixDatabase() {
    try {
        console.log('Connecting to database...');
        let pool = await sql.connect(config);
        console.log('Connected!');

        console.log('Adding costPrice and minStockLevel to Products table...');
        await pool.request().query(`
            IF COL_LENGTH('Products', 'costPrice') IS NULL
            BEGIN
                ALTER TABLE Products ADD costPrice DECIMAL(18,2) NOT NULL DEFAULT 0;
            END

            IF COL_LENGTH('Products', 'minStockLevel') IS NULL
            BEGIN
                ALTER TABLE Products ADD minStockLevel INT NOT NULL DEFAULT 0;
            END
        `);
        console.log('Columns added successfully.');

        await pool.close();
    } catch (err) {
        console.error('Error fixing database:', err);
    }
}

fixDatabase();
