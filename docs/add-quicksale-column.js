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

async function addQuickSaleColumn() {
    try {
        console.log('Connecting to database...');
        let pool = await sql.connect(config);
        console.log('Connected!');

        console.log('Adding isQuickSale to Products table...');
        await pool.request().query(`
            IF COL_LENGTH('Products', 'isQuickSale') IS NULL
            BEGIN
                ALTER TABLE Products ADD isQuickSale BIT NOT NULL DEFAULT 0;
            END
        `);
        console.log('Column added successfully.');

        await pool.close();
    } catch (err) {
        console.error('Error fixing database:', err);
    }
}

addQuickSaleColumn();
