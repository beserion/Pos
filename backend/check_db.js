const sql = require('mssql');
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
        const result = await sql.query('SELECT id, paymentMethod, totalAmount, discountAmount, serviceFee, status, isEndOfDayClosed FROM sales WHERE status = \'COMPLETED\' AND isEndOfDayClosed = 0');
        console.table(result.recordset);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
querySales();
