const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35', // You can use 'localhost\\instance' to connect to named instance
    database: 'AntigravityPOS',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        await sql.connect(config);
        
        let result = await sql.query("SELECT * FROM orders WHERE totalAmount = 885");
        console.log("Orders with amount 885:\n", result.recordset);

        let result2 = await sql.query("SELECT * FROM tables WHERE status = 'DOLU' OR currentTotal > 0");
        console.log("Occupied tables:\n", result2.recordset);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();
