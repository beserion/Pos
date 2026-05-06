const sql = require('mssql');
require('dotenv').config();
const cfg = {
  server: process.env.DB_HOST, port: +process.env.DB_PORT,
  user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  options: { encrypt: true, trustServerCertificate: true }
};

sql.connect(cfg).then(async pool => {

  // 1) Create invoice_items table if not exists
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'invoice_items') AND type = 'U')
    BEGIN
      CREATE TABLE invoice_items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        invoiceId INT NULL,
        productId INT NULL,
        productName NVARCHAR(255) NULL,
        quantity DECIMAL(10,2) DEFAULT 1,
        unit NVARCHAR(50) DEFAULT 'adet',
        unitPrice DECIMAL(12,2) DEFAULT 0,
        vatRate DECIMAL(5,2) DEFAULT 0,
        vatAmount DECIMAL(12,2) DEFAULT 0,
        lineTotal DECIMAL(12,2) DEFAULT 0,
        lineTotalWithVat DECIMAL(12,2) DEFAULT 0,
        description NVARCHAR(500) NULL
      );
      PRINT 'invoice_items table created';
    END
    ELSE PRINT 'invoice_items already exists';
  `);

  // 2) Add new columns to invoices table
  const cols = [
    { name: 'invoiceType', type: "NVARCHAR(50) DEFAULT 'PURCHASE'" },
    { name: 'partnerId', type: 'INT NULL' },
    { name: 'subtotal', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'discountRate', type: 'DECIMAL(5,2) DEFAULT 0' },
    { name: 'discountAmount', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'grandTotal', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'dueDate', type: 'DATE NULL' },
    { name: 'paymentMethod', type: "NVARCHAR(50) DEFAULT 'CASH'" },
    { name: 'warehouseLocation', type: 'NVARCHAR(255) NULL' },
  ];

  for (const col of cols) {
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID(N'invoices') AND name=N'${col.name}')
      BEGIN ALTER TABLE invoices ADD ${col.name} ${col.type}; PRINT '${col.name} added to invoices'; END
      ELSE PRINT '${col.name} already exists in invoices';
    `);
  }

  // 3) Add FK for invoice_items -> invoices
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_invoice_items_invoices')
    BEGIN
      ALTER TABLE invoice_items ADD CONSTRAINT FK_invoice_items_invoices
        FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE;
      PRINT 'FK_invoice_items_invoices created';
    END
    ELSE PRINT 'FK_invoice_items_invoices already exists';
  `);

  // 4) Add FK for invoice_items -> products
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_invoice_items_products')
    BEGIN
      ALTER TABLE invoice_items ADD CONSTRAINT FK_invoice_items_products
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE SET NULL;
      PRINT 'FK_invoice_items_products created';
    END
    ELSE PRINT 'FK_invoice_items_products already exists';
  `);

  // 5) Add FK for invoices -> partners
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_invoices_partners')
    BEGIN
      ALTER TABLE invoices ADD CONSTRAINT FK_invoices_partners
        FOREIGN KEY (partnerId) REFERENCES partners(id) ON DELETE SET NULL;
      PRINT 'FK_invoices_partners created';
    END
    ELSE PRINT 'FK_invoices_partners already exists';
  `);

  console.log('[Migration] Invoice tables migration: OK');
  pool.close();
}).catch(e => { console.error(e.message); process.exit(1); });
