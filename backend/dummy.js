const sql = require('mssql');
require('dotenv').config();
async function run() {
  const pool = await sql.connect({
      user: process.env.DB_USERNAME || 'sa', password: process.env.DB_PASSWORD, server: process.env.DB_HOST || 'localhost', database: process.env.DB_DATABASE || 'AntigravityPOS', options: { encrypt: true, trustServerCertificate: true }
  });
  try {
     await pool.request().query("ALTER TABLE locations ADD CONSTRAINT DF_f2da743fd650de3dacaf61c5b97 DEFAULT 0 FOR isActive");
     console.log("Dummy constraint added.");
  } catch(e) {
     console.log("Could not add:", e.message);
  }
  process.exit(0);
}
run();
