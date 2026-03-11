const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'YourStrong@Passw0rd',
    server: 'localhost',
    database: 'AntigravityPOS',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

async function checkPrinters() {
    try {
        console.log('Connecting to database...');
        await sql.connect(config);

        console.log('Selecting from printers...');
        const result = await sql.query(`SELECT * FROM printers`);
        console.log(`Found ${result.recordset.length} printers.`);
        if (result.recordset.length > 0) {
            console.log(result.recordset[0]);
        }
    } catch (err) {
        console.error('Database query failed:', err.message);
    } finally {
        await sql.close();
    }
}

checkPrinters();
