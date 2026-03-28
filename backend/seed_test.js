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
    console.log('Connected. Starting seed...');

    const pRes = await sql.query`SELECT TOP 1 id FROM partners WHERE isActive = 1`;
    const partnerId = pRes.recordset.length > 0 ? pRes.recordset[0].id : null;

    const prRes = await sql.query`SELECT TOP 2 id, price FROM products WHERE isActive = 1 AND price IS NOT NULL`;
    const products = prRes.recordset;

    if (products.length > 0) {
      const invNum = 'INV-TS-' + Math.floor(Math.random() * 10000);
      const invQuery = `
          INSERT INTO invoices (
              invoiceNumber, invoiceType, partnerId, issueDate, status, paymentMethod, description, subtotal, taxAmount, grandTotal, totalAmount, discountRate, discountAmount, createdAt, updatedAt
          ) OUTPUT INSERTED.id VALUES (
              '${invNum}', 'PURCHASE', ${partnerId || 'NULL'}, GETDATE(), 'ISSUED', 'CASH', 'Test faturasi.', 0, 0, 0, 0, 0, 0, GETDATE(), GETDATE()
          )
      `;
      const invInsert = await sql.query(invQuery);
      const invoiceId = invInsert.recordset[0].id;
      console.log('Created Invoice ID:', invoiceId);

      let subtotal = 0;
      let taxAmount = 0;

      for (const p of products) {
        const q = Math.ceil(Math.random() * 10);
        const st = Number(p.price) * q;
        const tx = st * 0.20;
        const tot = st + tx;
        subtotal += st;
        taxAmount += tx;

        await sql.query(`
          INSERT INTO invoice_items (invoiceId, productId, quantity, unitPrice, vatRate, unit, lineTotal, createdAt, updatedAt, isDeleted)
          VALUES (${invoiceId}, ${p.id}, ${q}, ${p.price}, 20, 'adet', ${tot}, GETDATE(), GETDATE(), 0)
        `);
      }

      await sql.query(`UPDATE invoices SET subtotal=${subtotal}, taxAmount=${taxAmount}, totalAmount=${subtotal}, grandTotal=${subtotal + taxAmount} WHERE id=${invoiceId}`);
      console.log('Invoice items seeded!');
    } else {
        console.log('NO PRODUCTS FOUND!');
    }

    console.log('Seeding reservations...');
    for (let i = 1; i <= 10; i++) {
        const statuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'ARRIVED'];
        const st = statuses[i % 4];

        const dt = new Date();
        dt.setDate(dt.getDate() + i);
        dt.setHours(18 + (i % 4), 0, 0, 0);

        const dStr = dt.toISOString().slice(0, 19).replace('T', ' ');

        await sql.query(`
          INSERT INTO reservations (
              customerName, customerPhone, reservationTime, guestCount, status, notes, createdAt, updatedAt, isDeleted
          ) VALUES (
              'Test Misafir ${i}', '+9055500010${String(i).padStart(2, '0')}', '${dStr}', ${(i % 5) + 2}, '${st}', 'Bu bir test rezervasyonudur.', GETDATE(), GETDATE(), 0
          )
        `);
    }
    console.log('10 Reservations seeded successfully!');

    process.exit(0);
  } catch (err) {
    console.error('Seed Failed Message:', err.message);
    process.exit(1);
  }
}
seed();
