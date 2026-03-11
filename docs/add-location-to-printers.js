const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'YourStrong@Passw0rd',
    server: 'localhost',
    database: 'AntigravityPOS',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

async function addLocationToPrinters() {
    try {
        await sql.connect(config);

        // Add location column
        await sql.query(`
            IF COL_LENGTH('printers', 'location') IS NULL
            BEGIN
                ALTER TABLE printers ADD location nvarchar(255) NULL;
                PRINT 'Added location column to printers table.';
            END
            ELSE
            BEGIN
                PRINT 'Location column already exists.';
            END
        `);
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await sql.close();
    }
}

addLocationToPrinters();
