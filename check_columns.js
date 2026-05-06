const mssql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
    server: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    options: {
        encrypt: true,
        trustServerCertificate: true,
    }
};

async function run() {
    try {
        await mssql.connect(config);
        const result = await mssql.query`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users'`;
        console.log('Users table columns:');
        result.recordset.forEach(row => console.log(row.COLUMN_NAME));
    } catch (err) {
        console.error(err);
    } finally {
        await mssql.close();
    }
}

run();
