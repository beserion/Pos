require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function seed() {
  try {
    console.log('Connecting to MSSQL at', config.server);
    await sql.connect(config);
    console.log('Connected. Starting accurate seed...');

    const prRes = await sql.query`SELECT TOP 5 id, price, name FROM products WHERE isActive = 1 AND price IS NOT NULL`;
    const products = prRes.recordset;

    if (products.length > 0) {
      // 1. Give at least 2 random items to EVERY existing invoice!
      const invoicesQ = await sql.query`SELECT id, subtotal, taxAmount FROM invoices`;
      let addedLines = 0;
      
      for (let inv of invoicesQ.recordset) {
          // Check if invoice already has items
          const checkQ = await sql.query(`SELECT COUNT(*) as c FROM invoice_items WHERE invoiceId = ${inv.id}`);
          if (checkQ.recordset[0].c === 0) {
             let currentSubtotal = Number(inv.subtotal) || 0;
             let currentTax = Number(inv.taxAmount) || 0;

             for (const p of products) {
                 const q = Math.ceil(Math.random() * 5);
                 const st = Number(p.price) * q;
                 const tx = st * 0.20; // 20% vatRate
                 const tot = st + tx;
                 
                 currentSubtotal += st;
                 currentTax += tx;

                 // EXACT columns: invoiceId, productId, productName, quantity, unit, unitPrice, vatRate, vatAmount, lineTotal, lineTotalWithVat, description
                 await sql.query(`
                   INSERT INTO invoice_items (invoiceId, productId, productName, quantity, unit, unitPrice, vatRate, vatAmount, lineTotal, lineTotalWithVat, description)
                   VALUES (${inv.id}, ${p.id}, '${p.name.replace(/'/g, "''")}', ${q}, 'adet', ${p.price}, 20, ${tx}, ${st}, ${tot}, 'Test kalemi')
                 `);
                 addedLines++;
             }

             await sql.query(`
                 UPDATE invoices 
                 SET subtotal=${currentSubtotal}, 
                     taxAmount=${currentTax}, 
                     totalAmount=${currentSubtotal}, 
                     grandTotal=${currentSubtotal + currentTax} 
                 WHERE id=${inv.id}
             `);
          }
      }
      console.log(`Added ${addedLines} items to existing empty invoices.`);
    }

    // 2. Create Reservations
    console.log('Seeding reservations...');
    const tablesQ = await sql.query`SELECT TOP 1 id FROM tables`;
    const tableId = tablesQ.recordset.length > 0 ? tablesQ.recordset[0].id : null;
    const locationId = null; // Just skip locationId for tests.

    let totalReservations = 0;
    for (let i = 1; i <= 10; i++) {
        const statuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'ARRIVED'];
        const st = statuses[i % 4];

        const dt = new Date();
        dt.setDate(dt.getDate() + i);
        dt.setHours(18 + (i % 4), 0, 0, 0);

        const dStr = dt.toISOString().slice(0, 19).replace('T', ' ');

        // EXACT columns check: customerName, customerPhone, reservationTime, guestCount, notes, status, createdAt, updatedAt, tableId, locationId
        await sql.query(`
          INSERT INTO reservations (
              customerName, customerPhone, reservationTime, guestCount, status, notes, createdAt, updatedAt, tableId, locationId
          ) VALUES (
              'Test Misafir ${i}', '+9055500010${String(i).padStart(2, '0')}', '${dStr}', ${(i % 5) + 2}, '${st}', 'Bu bir test rezervasyonudur.', GETDATE(), GETDATE(), ${tableId || 'NULL'}, ${locationId || 'NULL'}
          )
        `);
        totalReservations++;
    }
    console.log(`Seeded ${totalReservations} reservations!`);

    process.exit(0);
  } catch (err) {
    console.error('Seed Failed Message:', err.message);
    process.exit(1);
  }
}
seed();
