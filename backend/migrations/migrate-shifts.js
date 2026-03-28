const sql = require('mssql');
const config = {
  user: 'sa',
  password: 'Oryx123!',
  server: '149.34.201.35',
  database: 'AntigravityPOS',
  options: { encrypt: false, trustServerCertificate: true }
};

const queries = [
  // 1. Add cashRegisterId to users table (1:1 mapping)
  `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'cashRegisterId')
   BEGIN
     ALTER TABLE users ADD cashRegisterId INT NULL
   END`,

  // 2. Create shifts table
  `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('shifts') AND type = 'U')
   BEGIN
     CREATE TABLE shifts (
       id INT IDENTITY(1,1) PRIMARY KEY,
       userId INT NOT NULL,
       cashRegisterId INT NOT NULL,
       businessDate NVARCHAR(10) NOT NULL,
       openedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
       closedAt DATETIME2 NULL,
       status NVARCHAR(20) NOT NULL DEFAULT 'OPEN',
       openingCash DECIMAL(12,2) NOT NULL DEFAULT 0,
       closingCash DECIMAL(12,2) NULL,
       expectedCash DECIMAL(12,2) NULL,
       cashDifference DECIMAL(12,2) NULL,
       transferredToUserId INT NULL,
       note NVARCHAR(500) NULL,
       companyId INT NOT NULL DEFAULT 1,
       createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
       updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
     )
   END`,

  // 3. Add cashRegisterId and shiftId to sales table
  `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('sales') AND name = 'cashRegisterId')
   BEGIN
     ALTER TABLE sales ADD cashRegisterId INT NULL
   END`,

  `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('sales') AND name = 'shiftId')
   BEGIN
     ALTER TABLE sales ADD shiftId INT NULL
   END`
];

async function migrate() {
  try {
    await sql.connect(config);
    console.log('Connected to database.');

    for (let i = 0; i < queries.length; i++) {
      await new sql.Request().query(queries[i]);
      console.log(`Migration step ${i + 1}/${queries.length} completed.`);
    }

    console.log('All migrations completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
