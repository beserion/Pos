const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35', // You can use 'localhost\\instance' to connect to named instance
    database: 'AntigravityPOS',
    options: {
        encrypt: false, // Use this if you're on Windows Azure
        trustServerCertificate: true // Change to true for local dev / self-signed certs
    }
};

async function run() {
    try {
        await sql.connect(config);
        
        let result2 = await sql.query("SELECT id, tableId, status, totalAmount FROM sales WHERE tableId IS NOT NULL");
        console.log("Sales with tableId:\n", result2.recordset);

        let result3 = await sql.query("SELECT id, name, status, currentTotal FROM tables WHERE status = 'DOLU' OR currentTotal > 0");
        console.log("Tables occupied:\n", result3.recordset);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();
