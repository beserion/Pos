const sql = require('mssql');
const fs = require('fs');
require('dotenv').config();

const config = {
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function querySales() {
    try {
        await sql.connect(config);
        const result = await sql.query("SELECT id, paymentMethod, totalAmount, status FROM sales WHERE CONVERT(date, createdAt) = CONVERT(date, GETDATE())");
        fs.writeFileSync('db_out_native.json', JSON.stringify(result.recordset, null, 2), 'utf8');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
querySales();
