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
    
    let res = await pool.request().query('UPDATE account_transactions SET partnerId = NULL WHERE partnerId IS NOT NULL AND partnerId NOT IN (SELECT id FROM partners)');
    console.log("Fixed orphaned account_transactions (partnerId):", res.rowsAffected[0] || 0);

    res = await pool.request().query('UPDATE account_transactions SET accountId = NULL WHERE accountId IS NOT NULL AND accountId NOT IN (SELECT id FROM company_accounts)');
    console.log("Fixed orphaned account_transactions (accountId):", res.rowsAffected[0] || 0);

    res = await pool.request().query('UPDATE account_transactions SET recordedBy = NULL WHERE recordedBy IS NOT NULL AND recordedBy NOT IN (SELECT id FROM users)');
    console.log("Fixed orphaned account_transactions (recordedBy):", res.rowsAffected[0] || 0);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
