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
    
    let res = await pool.request().query('UPDATE account_transactions SET companyAccountId = NULL WHERE companyAccountId IS NOT NULL AND companyAccountId NOT IN (SELECT id FROM company_accounts)');
    console.log("Fixed orphaned account_transactions (companyAccountId):", res.rowsAffected[0] || 0);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
