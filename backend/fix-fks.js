const sql = require('mssql');
require('dotenv').config();

async function run() {
  try {
    const pool = await sql.connect({
      user: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD,
      server: process.env.DB_HOST || 'localhost',
      database: process.env.DB_DATABASE || 'AntigravityPOS',
      options: { encrypt: true, trustServerCertificate: true }
    });
    console.log("Connected");
    
    // Fix orphaned sales records to avoid FK violation error when TypeORM creates FK Constraints
    const res = await pool.request().query('UPDATE sales SET tableId = NULL WHERE tableId IS NOT NULL AND tableId NOT IN (SELECT id FROM tables)');
    console.log("Fixed orphaned sales:", res.rowsAffected[0]);

    // Also fix any other common ones just in case
    const res2 = await pool.request().query('UPDATE sale_items SET saleId = NULL WHERE saleId IS NOT NULL AND saleId NOT IN (SELECT id FROM sales)');
    console.log("Fixed orphaned sale_items:", res2.rowsAffected[0]);

    const res3 = await pool.request().query('UPDATE sales SET waiterId = NULL WHERE waiterId IS NOT NULL AND waiterId NOT IN (SELECT id FROM users)');
    console.log("Fixed orphaned sales (waiterId):", res3.rowsAffected[0]);

    const res4 = await pool.request().query('UPDATE sales SET userId = NULL WHERE userId IS NOT NULL AND userId NOT IN (SELECT id FROM users)');
    console.log("Fixed orphaned sales (userId):", res4.rowsAffected[0]);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
