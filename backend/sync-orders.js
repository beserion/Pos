const sql = require('mssql');
const fs = require('fs');

const configLocal = {
    user: 'sa',
    password: 'YourStrong@Passw0rd',
    server: 'localhost',
    database: 'AntigravityPOS',
    options: { encrypt: false, trustServerCertificate: true }
};

const configRemote = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35',
    database: 'AntigravityPOS',
    options: { encrypt: false, trustServerCertificate: true }
};

async function syncOrders() {
    try {
        console.log('Connecting to Local DB...');
        const poolLocal = await sql.connect(configLocal);

        let outputSql = `USE [AntigravityPOS];\nGO\n\n`;

        // Tables to copy
        const tablesToCopy = ['orders', 'order_items', 'tickets', 'printer_jobs'];

        for (const table of tablesToCopy) {
            // Check if table exists locally
            const check = await poolLocal.request().query(`SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${table}'`);
            if (check.recordset.length === 0) continue;

            console.log(`Extracting schema for ${table}...`);
            // Easiest is to just drop and recreate on remote if needed, but we'll fetch schema manually if possible, or just dump data if we know schema.
            // Wait, we can't easily extract full schema natively via script without SMO. 
            // Let's check TypeORM sync output or script it.
        }
        await poolLocal.close();
    } catch (err) {
        console.error(err);
    }
}
syncOrders();
