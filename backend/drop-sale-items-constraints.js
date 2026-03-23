const sql = require('mssql');
require('dotenv').config();

async function run() {
  try {
    await sql.connect({
      user: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD,
      server: process.env.DB_HOST || 'localhost',
      database: process.env.DB_DATABASE || 'AntigravityPOS',
      options: { encrypt: true, trustServerCertificate: true }
    });
    console.log("Connected");
    
    // Drop default constraints on sale_items
    const result = await sql.query(`
      SELECT 'ALTER TABLE [' + s.name + '].[' + t.name + '] DROP CONSTRAINT [' + c.name + ']' AS cmd
      FROM sys.default_constraints c
      INNER JOIN sys.tables t ON c.parent_object_id = t.object_id
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      WHERE t.name IN ('sale_items')
    `);
    
    for (let row of result.recordset) {
      console.log("Executing:", row.cmd);
      try {
        await sql.query(row.cmd);
      } catch (err) {
        console.error("Error on cmd:", row.cmd, err.message);
      }
    }
    console.log("Done");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
