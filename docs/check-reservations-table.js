const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const config = {
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
    server: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: process.env.DB_INSTANCE || undefined,
    },
    port: process.env.DB_INSTANCE ? undefined : parseInt(process.env.DB_PORT || '1433', 10)
};

async function checkSchemas() {
    try {
        await sql.connect(config);
        console.log('--- DB_CHECK_START ---');

        const tables = await sql.query`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES`;
        tables.recordset.forEach(t => console.log('TABLE_FOUND:', t.TABLE_NAME));

        console.log('--- SCHEMA: tables ---');
        const tablesCols = await sql.query`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tables'`;
        tablesCols.recordset.forEach(c => console.log(`COLUMN: tables.${c.COLUMN_NAME} (${c.DATA_TYPE})`));

        console.log('--- SCHEMA: locations ---');
        const locationsCols = await sql.query`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'locations'`;
        locationsCols.recordset.forEach(c => console.log(`COLUMN: locations.${c.COLUMN_NAME} (${c.DATA_TYPE})`));

        console.log('--- CONSTRAINTS: all ---');
        const allFks = await sql.query`SELECT name, OBJECT_NAME(parent_object_id) as parent_table FROM sys.foreign_keys`;
        allFks.recordset.forEach(fk => {
            if (fk.name.includes('Reservations')) {
                console.log('FK_FOUND:', fk.name, 'ON_TABLE:', fk.parent_table);
            }
        });

        console.log('--- DB_CHECK_END ---');
    } catch (err) {
        console.error('Check failed:', err.message);
    } finally {
        await sql.close();
    }
}

checkSchemas();
