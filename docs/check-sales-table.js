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

async function checkSalesTable() {
    try {
        await sql.connect(config);
        console.log('--- DB_CHECK_START ---');

        const tables = await sql.query`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME IN ('sales', 'sale_items', 'products')`;
        tables.recordset.forEach(t => console.log('TABLE_FOUND:', t.TABLE_NAME));

        if (tables.recordset.some(t => t.TABLE_NAME === 'sales')) {
            console.log('--- SCHEMA: sales ---');
            const salesCols = await sql.query`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sales'`;
            salesCols.recordset.forEach(c => console.log(`COLUMN: sales.${c.COLUMN_NAME} (${c.DATA_TYPE})`));
        }

        if (tables.recordset.some(t => t.TABLE_NAME === 'sale_items')) {
            console.log('--- SCHEMA: sale_items ---');
            const itemCols = await sql.query`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sale_items'`;
            itemCols.recordset.forEach(c => console.log(`COLUMN: sale_items.${c.COLUMN_NAME} (${c.DATA_TYPE})`));
        }

        console.log('--- DB_CHECK_END ---');
    } catch (err) {
        console.error('Check failed:', err.message);
    } finally {
        await sql.close();
    }
}

checkSalesTable();
