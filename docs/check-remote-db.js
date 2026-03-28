// Quick test: can TypeORM connect with the .env config?
require('dotenv').config();
const mssql = require('mssql');

const cfg = {
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'Oryx123!',
    server: process.env.DB_HOST || '149.34.201.35',
    port: parseInt(process.env.DB_PORT || '1433'),
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    options: { encrypt: false, trustServerCertificate: true, connectTimeout: 30000 },
};

console.log('Connecting to:', cfg.server, cfg.database);
mssql.connect(cfg).then(async () => {
    console.log('Connected!');
    // Check tables
    const r = await mssql.query(`
        SELECT t.name as tbl, p.rows 
        FROM sys.tables t 
        JOIN sys.partitions p ON t.object_id = p.object_id 
        WHERE p.index_id IN (0,1) 
        ORDER BY t.name
    `);
    console.log('Tables:');
    r.recordset.forEach(x => console.log(' ', x.tbl.padEnd(35), x.rows));
    mssql.close();
}).catch(e => {
    console.error('Connection FAILED:', e.message);
    mssql.close();
});
