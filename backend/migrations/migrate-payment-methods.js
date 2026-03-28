const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Oryx123!',
  server: process.env.DB_SERVER || '149.34.201.35',
  database: process.env.DB_NAME || 'AntigravityPOS',
  options: { encrypt: false, trustServerCertificate: true }
};

const query = `
  IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('cash_registers') AND name = 'allowedPaymentMethods')
  BEGIN
    ALTER TABLE cash_registers ADD allowedPaymentMethods NVARCHAR(MAX) NULL
  END
`;

async function migrate() {
  try {
    await sql.connect(config);
    console.log('Connected to database.');

    await new sql.Request().query(query);
    console.log('Migration completed successfully: added allowedPaymentMethods to cash_registers');

    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
