const sql = require('mssql');
const dotenv = require('dotenv');
dotenv.config();

const config = {
    server: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    options: { encrypt: false, trustServerCertificate: true }
};

(async () => {
    const pool = await sql.connect(config);
    const cols = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users'");
    console.log('Users columns:', cols.recordset.map(c => c.COLUMN_NAME).join(', '));
    const rows = await pool.request().query("SELECT TOP 3 id, username, email, isActive FROM users");
    console.log('Users sample:', JSON.stringify(rows.recordset, null, 2));
    pool.close();
})().catch(e => console.error(e.message));
