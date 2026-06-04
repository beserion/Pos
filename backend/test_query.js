const mssql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'posnetx',
    server: 'localhost',
    database: process.env.DB_DATABASE || 'Posnetx',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    }
};

async function run() {
    try {
        await mssql.connect(config);
        
        console.log('--- Table Check: sales paymentMethods and status ---');
        const salesStats = await mssql.query`
            SELECT paymentMethod, status, COUNT(*) as count 
            FROM sales 
            GROUP BY paymentMethod, status
        `;
        console.log('Distinct paymentMethod & status in sales:');
        console.table(salesStats.recordset);

        console.log('\n--- Listing all column names in sales table ---');
        const salesCols = await mssql.query`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'sales'
        `;
        console.table(salesCols.recordset);

    } catch (err) {
        console.error(err);
    } finally {
        await mssql.close();
    }
}

run();

