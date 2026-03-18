import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  console.log('Starting DB connection setup...');
  const connection = await createConnection({
    type: 'mssql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '1433'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: false,
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  });

  console.log('Connected to DB:', process.env.DB_HOST);

  const queryRunner = connection.createQueryRunner();
  await queryRunner.connect();

  console.log('Creating company_accounts table...');

  await queryRunner.query(`
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

  console.log('Table created or already exists.');
  await connection.close();
}

run().catch(err => {
    console.error('Error occurred:');
    console.error(err);
});
