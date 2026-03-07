const sql = require('mssql');
async function verify() {
    try {
        await sql.connect({
            user: 'sa',
            password: 'Oryx123!',
            server: '149.34.201.35',
            database: 'AntigravityPOS',
            port: 1433,
            options: { encrypt: false, trustServerCertificate: true },
        });
        const tables = await sql.query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'`);
        console.log(`Found ${tables.recordset.length} tables.`);

        const users = await sql.query(`SELECT COUNT(*) as count FROM users`);
        console.log(`Found ${users.recordset[0].count} users.`);

        sql.close();
    } catch (err) {
        console.error("VERIFY FAILED:", err.message);
    }
}
verify();
