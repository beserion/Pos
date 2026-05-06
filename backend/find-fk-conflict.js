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
    
    // Check if the constraint exists
    const res = await pool.request().query(`
      SELECT 
        OBJECT_NAME(parent_object_id) AS TableName,
        COL_NAME(parent_object_id, parent_column_id) AS ColumnName
      FROM sys.foreign_key_columns
      WHERE constraint_object_id = OBJECT_ID('FK_14517edea4762ce42846ee0b536')
    `);
    
    if (res.recordset && res.recordset.length > 0) {
      console.log('Constraint found:', res.recordset);
    } else {
      console.log('Constraint not found in sys.foreign_key_columns, it might be a new constraint TypeORM is trying to create!');
    }

    const orphans = [];
    const checks = [
      { table: 'stocks', col: 'stockCardId' },
      { table: 'stock_movements', col: 'stockCardId' },
      { table: 'recipe_lines', col: 'stockCardId' },
      { table: 'recipe_lines', col: 'ingredientId' },
      { table: 'inventory_session_lines', col: 'stockCardId' },
      { table: 'product_transactions', col: 'stockCardId' },
      { table: 'sale_items', col: 'stockCardId' }
    ];
    
    for (const check of checks) {
      try {
        const tableCheck = await pool.request().query(`
          SELECT * FROM sys.columns 
          WHERE Name = N'${check.col}' 
          AND Object_ID = Object_ID(N'${check.table}')
        `);
        if (tableCheck.recordset.length > 0) {
           const orphanRes = await pool.request().query(`SELECT COUNT(*) as count FROM ${check.table} WHERE ${check.col} IS NOT NULL AND ${check.col} NOT IN (SELECT id FROM stock_cards)`);
           if (orphanRes.recordset[0].count > 0) {
             console.log(`FOUND ORPHANS in ${check.table}.${check.col}: ${orphanRes.recordset[0].count}`);
             orphans.push(check);
           }
        }
      } catch (e) { }
    }
    
    // Also check if stock_cards has orphaned foreign keys pointing to other tables
    const parentChecks = [
      { table: 'stock_cards', col: 'warehouseId', ref: 'warehouses' },
      { table: 'stock_cards', col: 'outputProfileId', ref: 'output_profiles' },
      { table: 'stock_cards', col: 'stockGroupId', ref: 'stock_groups' }
    ];

    for (const p of parentChecks) {
      try {
        const o = await pool.request().query(`SELECT COUNT(*) as count FROM ${p.table} WHERE ${p.col} IS NOT NULL AND ${p.col} NOT IN (SELECT id FROM ${p.ref})`);
        if (o.recordset[0].count > 0) {
          console.log(`FOUND ORPHANS in ${p.table}.${p.col} referring to ${p.ref}: ${o.recordset[0].count}`);
        }
      } catch (e) { }
    }
    
    console.log('Done scanning.');

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
