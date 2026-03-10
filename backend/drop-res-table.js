const sql = require('mssql');
require('dotenv').config();

async function run() {
    try {
        await sql.connect({
            user: process.env.DB_USERNAME || 'sa',
            password: process.env.DB_PASSWORD || '123456',
            server: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '1433', 10),
            database: process.env.DB_DATABASE || 'AntigravityPOS',
            options: { encrypt: false, trustServerCertificate: true }
        });

        console.log('Dropping reservations table...');

        await sql.query(`
            IF OBJECT_ID('dbo.reservations', 'U') IS NOT NULL 
            BEGIN
                -- Drop any referencing foreign keys first if any
                DECLARE @dropFKQuery NVARCHAR(MAX) = '';
                SELECT @dropFKQuery += 'ALTER TABLE [' + OBJECT_NAME(f.parent_object_id) + '] DROP CONSTRAINT [' + f.name + ']; '
                FROM sys.foreign_keys AS f
                WHERE f.referenced_object_id = OBJECT_ID('dbo.reservations');
                
                IF @dropFKQuery <> '' EXEC sp_executesql @dropFKQuery;

                DROP TABLE dbo.reservations;
            END
        `);

        console.log('Successfully dropped reservations table.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}
run();
