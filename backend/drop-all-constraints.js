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
    
    // Find ALL default constraints in the DB
    const result = await pool.request().query(`
      SELECT 'ALTER TABLE [' + s.name + '].[' + t.name + '] DROP CONSTRAINT [' + c.name + ']' AS cmd
      FROM sys.default_constraints c
      INNER JOIN sys.tables t ON c.parent_object_id = t.object_id
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    `);
    
    let dropped = 0;
    for (let row of result.recordset) {
      try {
        await pool.request().query(row.cmd);
        dropped++;
      } catch (err) {
        console.error("Error dropping:", row.cmd, err.message);
      }
    }
    console.log("Successfully dropped " + dropped + " default constraints. TypeORM schema sync can now recreate them cleanly.");
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
