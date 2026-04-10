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
    
    for (const table of ['stock_cards', 'products', 'stocks', 'order_items', 'wastages', 'purchase_order_items', 'sale_items']) {
      try {
        const c = await pool.request().query(`SELECT COUNT(*) as c FROM ${table}`);
        console.log(`${table}: ${c.recordset[0].c} rows`);
      } catch(e) {}
    }
    
    // Check orphans using productId
    for (const table of ['stocks', 'order_items', 'wastages', 'purchase_order_items', 'sale_items']) {
      try {
        const c = await pool.request().query(`SELECT COUNT(*) as c FROM ${table} WHERE productId IS NOT NULL AND productId NOT IN (SELECT id FROM stock_cards)`);
         console.log(`Orphaned ${table}.productId not in stock_cards: ${c.recordset[0].c}`);
      } catch(e) {}
    }

    // Check if there is a mapping we can use
    try {
        const p = await pool.request().query(`SELECT TOP 1 id, stockCardId FROM products WHERE stockCardId IS NOT NULL`);
        console.log('Sample product mapping:', p.recordset);
    } catch(e){}

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
