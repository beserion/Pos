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
    
    // In SQL Server, multiple NULLs violate a UNIQUE constraint.
    // We will update NULL barcodes to a unique string like 'NO_BARCODE_123'
    const res = await pool.request().query(`
      UPDATE products
      SET barcode = 'NO_BARCODE_' + CAST(id AS VARCHAR(10))
      WHERE barcode IS NULL OR barcode = ''
    `);
    console.log("Rows affected (NULLs fixed):", res.rowsAffected);
    
    // Double check if there are any other direct duplicates
    const res2 = await pool.request().query(`
      SELECT barcode, COUNT(*) as cnt
      FROM products
      GROUP BY barcode
      HAVING COUNT(*) > 1
    `);
    if (res2.recordset.length > 0) {
      console.log("Other duplicates:", res2.recordset);
      // Fix them too
      const duplicates = res2.recordset.map(row => row.barcode).join("','");
      const fixRes = await pool.request().query(`
        UPDATE products
        SET barcode = barcode + '-' + CAST(id AS VARCHAR(10))
        WHERE barcode IN ('${duplicates}') AND id NOT IN (
            SELECT MIN(id) FROM products GROUP BY barcode HAVING COUNT(*) > 1
        )
      `);
      console.log("Rows affected (Other duplicates fixed):", fixRes.rowsAffected);
    } else {
      console.log("No further duplicates found.");
    }

    try {
      console.log("Adding UNIQUE constraint UQ_adfc522baf9d9b19cd7d9461b7e...");
      await pool.request().query(`ALTER TABLE products ADD CONSTRAINT UQ_adfc522baf9d9b19cd7d9461b7e UNIQUE (barcode)`);
      console.log("Constraint added successfully.");
    } catch (e) {
      console.log("Constraint might already exist or failed:", e.message);
    }

    console.log("Done");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
