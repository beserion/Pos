const sql = require('mssql');
require('dotenv').config({ path: __dirname + '/.env' });

async function run() {
  try {
    const pool = await sql.connect({
      user: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD,
      server: process.env.DB_HOST || 'localhost',
      database: process.env.DB_DATABASE || 'AntigravityPOS',
      options: { encrypt: true, trustServerCertificate: true }
    });
    
    // Set to NULL
    const tables = ['stocks', 'order_items', 'wastages', 'purchase_order_items'];
    for (const table of tables) {
       try {
           const res = await pool.request().query(`UPDATE ${table} SET productId = NULL WHERE productId IS NOT NULL`);
           console.log(`Updated ${res.rowsAffected[0]} rows in ${table}`);
       } catch (err) {
           console.log(`Failed to update ${table}:`, err.message);
           // If it fails (e.g., column is not nullable), we delete the rows
           try {
               const delRes = await pool.request().query(`DELETE FROM ${table} WHERE productId IS NOT NULL`);
               console.log(`Deleted ${delRes.rowsAffected[0]} rows from ${table}`);
           } catch (err2) {
               console.log(`Failed to delete from ${table}:`, err2.message);
           }
       }
    }
    
    // Try to update any newly renamed columns if TypeORM previously got halfway
    for (const table of tables) {
       try {
           const res = await pool.request().query(`UPDATE ${table} SET stockCardId = NULL WHERE stockCardId IS NOT NULL`);
           console.log(`Updated ${res.rowsAffected[0]} rows (stockCardId) in ${table}`);
       } catch (err) {
           // ignore if column doesn't exist
       }
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
