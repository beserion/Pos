const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35', 
    database: 'AntigravityPOS',
    options: { encrypt: false, trustServerCertificate: true }
};

async function run() {
    try {
        await sql.connect(config);
        
        let result = await sql.query("SELECT * FROM orders");
        console.log("All Orders:\n", result.recordset);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();
