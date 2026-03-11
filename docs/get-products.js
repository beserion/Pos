const sql = require('mssql');
const fs = require('fs');
const config = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35',
    database: 'AntigravityPOS',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        await sql.connect(config);
        const result = await sql.query('SELECT id, name, imageUrl FROM Products');
        fs.writeFileSync('products_list.json', JSON.stringify(result.recordset, null, 2));
        console.log('File written: products_list.json');
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

run();
