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

        console.log('Adding unit to Products table...');
        await pool.request().query(`
            IF COL_LENGTH('Products', 'unit') IS NULL
            BEGIN
                ALTER TABLE Products ADD unit NVARCHAR(50) NULL DEFAULT 'adet';
            END
        `);
        console.log('Column unit added successfully.');

        await pool.close();
    } catch (err) {
        console.error('Error fixing database:', err);
    }
}

fixDatabase();
