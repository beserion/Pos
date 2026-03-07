const sql = require('mssql');
async function test() {
    try {
        console.log('Testing connection to 149.34.201.35...');
        await sql.connect({
            user: 'sa',
            password: 'Oryx123!',
            server: '149.34.201.35',
            database: 'AntigravityPOS',
            port: 1433,
            options: { encrypt: false, trustServerCertificate: true },
            connectionTimeout: 5000
        });
        console.log("SUCCESSFUL CONNECTION!");
        sql.close();
    } catch (err) {
        console.error("CONNECTION FAILED:", err.message);
    }
}
test();
