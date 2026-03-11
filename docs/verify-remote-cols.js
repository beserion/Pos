const sql = require('mssql');
async function verify() {
    try {
        console.log("Checking columns on 149.34.201.35...");
        await sql.connect({
            user: 'sa',
            password: 'Oryx123!',
            server: '149.34.201.35',
            database: 'AntigravityPOS',
            port: 1433,
            options: { encrypt: false, trustServerCertificate: true },
        });

        const cols = await sql.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Products' AND COLUMN_NAME IN ('costPrice', 'minStockLevel', 'unit')
        `);
        console.log("Found missing columns:", cols.recordset);
        sql.close();
    } catch (err) {
        console.error("VERIFY FAILED:", err.message);
    }
}
verify();
