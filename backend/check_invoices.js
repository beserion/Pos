const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
};

async function run() {
    try {
        await sql.connect(config);
        // Check column nullability
        const result = await sql.query(`
            SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'invoices'
            ORDER BY ORDINAL_POSITION
        `);
        const fs = require('fs');
        fs.writeFileSync('invoice_columns.json', JSON.stringify(result.recordset, null, 2), 'utf8');
        console.log('Done');
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit(0);
    }
}
run();
