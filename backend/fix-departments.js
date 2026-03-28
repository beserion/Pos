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
    
    // Fix departments -> locations FK
    let res = await pool.request().query('UPDATE departments SET locationId = NULL WHERE locationId IS NOT NULL AND locationId NOT IN (SELECT id FROM locations)');
    console.log("Fixed orphaned departments (locationId):", res.rowsAffected[0] || 0);

    // Let's also preemptively fix users -> departments
    res = await pool.request().query('UPDATE users SET departmentId = NULL WHERE departmentId IS NOT NULL AND departmentId NOT IN (SELECT id FROM departments)');
    console.log("Fixed orphaned users (departmentId):", res.rowsAffected[0] || 0);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
