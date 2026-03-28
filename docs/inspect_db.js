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
        
        // Let's check what we have in orders, sales and tables
        let result1 = await sql.query("SELECT COUNT(*) as count FROM orders WHERE tableId IS NOT NULL AND status IN ('NEW', 'PREPARATION')");
        console.log("Orders with tableId (ACTIVE):", result1.recordset[0].count);

        let result2 = await sql.query("SELECT COUNT(*) as count FROM sales WHERE tableId IS NOT NULL AND status IN ('NEW', 'PREPARATION')");
        console.log("Sales with tableId (ACTIVE):", result2.recordset[0].count);

        let result3 = await sql.query("SELECT id, name, status, currentTotal FROM tables WHERE status = 'DOLU'");
        console.dir(result3.recordset);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();
