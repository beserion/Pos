const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35',
    database: 'AntigravityPOS',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function getProducts() {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query('SELECT id, name FROM products');
        console.dir(result.recordset);
        await pool.close();
    } catch (err) {
        console.error(err);
    }
}
getProducts();
