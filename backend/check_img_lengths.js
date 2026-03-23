const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'YourStrong@Passw0rd',
    server: 'localhost',
    database: 'AntigravityPOS',
    options: { encrypt: true, trustServerCertificate: true },
};

(async () => {
    try {
        await sql.connect(config);
        const res = await sql.query('SELECT top 20 id, name, len(imageUrl) as img_len, substring(imageUrl, 1, 30) as img_preview FROM products');
        console.table(res.recordset);
    } catch (err) {
        console.error('DB Error:', err.message);
    } finally {
        process.exit();
    }
})();
