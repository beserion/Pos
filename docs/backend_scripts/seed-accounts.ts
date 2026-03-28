import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const configs = [
    {
      type: 'mssql',
      host: 'localhost',
      port: 1433,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    },
    {
      type: 'mssql',
      host: 'localhost',
      port: 1433,
      database: process.env.DB_DATABASE,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        trustedConnection: true
      }
    }
  ];

  for (const config of configs) {
    try {
      console.log(`Trying connection to ${config.database} with ${config.username || 'Windows Auth'}...`);
      const connection = await createConnection(config as any);
      console.log('Connected!');
      
      // 1. Ensure table exists
      await connection.query(`
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[company_accounts]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[company_accounts] (
                [id] INT IDENTITY(1,1) PRIMARY KEY,
                [name] NVARCHAR(255) NOT NULL,
                [type] NVARCHAR(50) NOT NULL,
                [accountNumber] NVARCHAR(100) NULL,
                [iban] NVARCHAR(100) NULL,
                [balance] DECIMAL(18,2) DEFAULT 0.00,
                [currency] NVARCHAR(10) DEFAULT 'TL',
                [isActive] BIT DEFAULT 1,
                [createdAt] DATETIME2 DEFAULT GETDATE(),
                [updatedAt] DATETIME2 DEFAULT GETDATE()
            )
        END
      `);

      // 2. Ensure column exists
      try {
        await connection.query('ALTER TABLE account_transactions ADD companyAccountId INT NULL');
        console.log('Added companyAccountId column');
      } catch (e) {
        console.log('Column companyAccountId likely exists');
      }

      // 3. Add sample data
      const count = await connection.query('SELECT COUNT(*) as count FROM company_accounts');
      if (count[0].count === 0) {
        await connection.query(`
          INSERT INTO company_accounts (name, type, balance, currency, isActive, iban)
          VALUES 
          (N'Merkez Kasa', 'CASH', 15450.00, 'TL', 1, 'TR000000000000000000000001'),
          (N'Ziraat Bankası - Vadesiz', 'BANK', 45780.00, 'TL', 1, 'TR123456789012345678901234'),
          (N'Garanti BBVA - POS', 'BANK', 12300.00, 'TL', 1, 'TR987654321098765432109876')
        `);
        console.log('Sample data inserted');
      }

      await connection.close();
      console.log('All tasks completed successfully.');
      return;
    } catch (err: any) {
      console.error(`Failed with ${config.username || 'Windows Auth'}: ${err.message}`);
    }
  }
}

run().catch(console.error);
