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
        
        let r1 = await sql.query("SELECT id, status, currentTotal FROM tables WHERE status = 'DOLU' OR currentTotal > 0");
        console.log("Occupied Tables:", r1.recordset);

        let r2 = await sql.query("SELECT id, tableId, status, totalAmount FROM sales");
        console.log("All Sales:", r2.recordset);

        let r3 = await sql.query("SELECT * FROM sale_items");
        console.log("All Sale Items:", r3.recordset.length);

        // Reset tables that have no ACTIVE sales
        for (let table of r1.recordset) {
            let salesForTable = r2.recordset.filter(s => s.tableId === table.id && ['NEW','PREPARATION','READY','SERVED'].includes(s.status));
            
            if (salesForTable.length === 0) {
                console.log(`Table ${table.id} has no active sales, resetting to BOŞ.`);
                await sql.query(`UPDATE tables SET status = 'BOŞ', currentTotal = 0, waiterName = '' WHERE id = ${table.id}`);
            } else {
                let actualTotal = salesForTable.reduce((sum, s) => sum + s.totalAmount, 0);
                console.log(`Table ${table.id} has active sales summing to ${actualTotal}. Updating currentTotal from ${table.currentTotal} to ${actualTotal}`);
                await sql.query(`UPDATE tables SET currentTotal = ${actualTotal} WHERE id = ${table.id}`);
            }
        }
        
        console.log("Done fixing tables.");

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();
