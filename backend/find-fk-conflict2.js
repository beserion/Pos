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
    
    const orphans = [];
    const checks = [
      { table: 'stocks', col: 'stockCardId' },
      { table: 'stock_movements', col: 'stockCardId' },
      { table: 'recipe_lines', col: 'stockCardId' },
      { table: 'recipe_lines', col: 'ingredientId' },
      { table: 'inventory_session_lines', col: 'stockCardId' },
      { table: 'product_transactions', col: 'stockCardId' },
      { table: 'sale_items', col: 'stockCardId' },
      { table: 'purchase_order_items', col: 'stockCardId' },
      { table: 'stock_groups', col: 'stockCardId' }
    ];
    
    for (const check of checks) {
      try {
        const tableCheck = await pool.request().query(`
          SELECT * FROM sys.columns 
          WHERE Name = N'${check.col}' 
          AND Object_ID = Object_ID(N'${check.table}')
        `);
        if (tableCheck.recordset.length > 0) {
           const query = \`SELECT COUNT(*) as count FROM \${check.table} c 
                          WHERE c.\${check.col} IS NOT NULL 
                          AND NOT EXISTS (SELECT 1 FROM stock_cards p WHERE p.id = c.\${check.col})\`;
           const orphanRes = await pool.request().query(query);
           if (orphanRes.recordset[0].count > 0) {
             console.log(\`FOUND ORPHANS in \${check.table}.\${check.col}: \${orphanRes.recordset[0].count}\`);
             orphans.push(check);
             
             // Fix it immediately by setting to NULL or deleting
             // If the column is nullable, set to NULL. Otherwise, this might fail or we should delete the row.
             const isNullableRes = await pool.request().query(\`SELECT is_nullable FROM sys.columns WHERE Name = N'\${check.col}' AND Object_ID = Object_ID(N'\${check.table}')\`);
             const isNullable = isNullableRes.recordset[0].is_nullable;
             
             if (isNullable) {
               console.log(\`Fixing by setting to NULL\`);
               await pool.request().query(\`UPDATE \${check.table} SET \${check.col} = NULL WHERE \${check.col} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM stock_cards p WHERE p.id = \${check.table}.\${check.col})\`);
             } else {
               console.log(\`Fixing by deleting rows as column is NOT NULL\`);
               await pool.request().query(\`DELETE FROM \${check.table} WHERE \${check.col} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM stock_cards p WHERE p.id = \${check.table}.\${check.col})\`);
             }
           }
        }
      } catch (e) {
        console.error(e);
      }
    }
    
    // Check parent orphans
    const parentChecks = [
      { table: 'stock_cards', col: 'warehouseId', ref: 'warehouses' },
      { table: 'stock_cards', col: 'outputProfileId', ref: 'output_profiles' },
      { table: 'stock_cards', col: 'stockGroupId', ref: 'stock_groups' },
      { table: 'products', col: 'stockCardId', ref: 'stock_cards' } // What if products has stockCardId pointing to something?
    ];

    for (const p of parentChecks) {
      try {
        const o = await pool.request().query(\`SELECT COUNT(*) as count FROM \${p.table} c WHERE c.\${p.col} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM \${p.ref} p WHERE p.id = c.\${p.col})\`);
        if (o.recordset[0].count > 0) {
          console.log(\`FOUND ORPHANS in \${p.table}.\${p.col} referring to \${p.ref}: \${o.recordset[0].count}\`);
          await pool.request().query(\`UPDATE \${p.table} SET \${p.col} = NULL WHERE \${p.col} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM \${p.ref} p WHERE p.id = \${p.table}.\${p.col})\`);
        }
      } catch (e) { console.error(e); }
    }
    
    console.log('Done scanning and fixing.');

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
