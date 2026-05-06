const sql = require('mssql');
require('dotenv').config();

async function runMigration() {
  const config = {
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
    server: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  };

  if (process.env.DB_INSTANCE) {
    config.server = `${process.env.DB_HOST}\\${process.env.DB_INSTANCE}`;
    console.log(`Using named instance: ${config.server}`);
  } else {
    config.port = parseInt(process.env.DB_PORT || '1433', 10);
  }

  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);
    console.log('Connected.');

    // 1. Create z_reports table
    console.log('Checking if z_reports table exists...');
    const tableCheck = await pool.request().query(`
      SELECT * FROM sys.tables WHERE name = 'z_reports'
    `);

    if (tableCheck.recordset.length === 0) {
      console.log('Creating z_reports table...');
      await pool.request().query(`
        CREATE TABLE z_reports (
          id INT IDENTITY(1,1) PRIMARY KEY,
          cashRegisterId INT NOT NULL,
          businessDate NVARCHAR(10) NOT NULL,
          totalOpeningCash DECIMAL(12,2) NOT NULL DEFAULT 0,
          totalClosingCash DECIMAL(12,2) NOT NULL DEFAULT 0,
          totalExpectedCash DECIMAL(12,2) NOT NULL DEFAULT 0,
          totalCashDifference DECIMAL(12,2) NOT NULL DEFAULT 0,
          totalIncome DECIMAL(12,2) NOT NULL DEFAULT 0,
          totalExpense DECIMAL(12,2) NOT NULL DEFAULT 0,
          generatedByUserId INT NOT NULL,
          companyId INT NOT NULL DEFAULT 1,
          createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
          updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
        )
      `);
      console.log('z_reports table created successfully.');
    } else {
      console.log('z_reports table already exists, skipping creation.');
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
