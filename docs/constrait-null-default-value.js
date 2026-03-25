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

    const result = await pool.request().query(`
      SELECT 
          s.name AS SchemaName,
          t.name AS TableName,
          c.name AS ColumnName
      FROM sys.columns c
      INNER JOIN sys.tables t ON c.object_id = t.object_id
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
      WHERE ty.name IN ('int', 'bigint', 'smallint', 'tinyint', 'decimal', 'numeric', 'float', 'real', 'bit')
        AND c.is_identity = 0
    `);
    
    let updated = 0;
    for (let row of result.recordset) {
      const cmd = `UPDATE [${row.SchemaName}].[${row.TableName}] SET [${row.ColumnName}] = 0 WHERE [${row.ColumnName}] IS NULL`;
      try {
        const res = await pool.request().query(cmd);
        if (res.rowsAffected[0] > 0) {
            console.log(`Updated ${res.rowsAffected[0]} NULLs to 0 in ${row.TableName}.${row.ColumnName}`);
            updated += res.rowsAffected[0];
        }
      } catch (err) {
        // Ignored, might fail due to FK constraints or computed columns
      }
    }
    console.log("Total NULLs updated to 0:", updated);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
