const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'YourStrong@Passw0rd',
    server: 'localhost',
    database: 'AntigravityPOS',
    options: { 
        encrypt: true, 
        trustServerCertificate: true,
        instanceName: 'SQLSERVER'
    },
};

(async () => {
    try {
        await sql.connect(config);
        const res = await sql.query('SELECT top 10 id, status, totalAmount, createdAt, tableId, partnerId, tableName FROM sales ORDER BY id DESC');
        console.table(res.recordset);
    } catch (err) {
        console.error('DB Error:', err.message);
    } finally {
        process.exit();
    }
})();
