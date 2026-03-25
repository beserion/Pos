import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';

const instanceName = process.env.DB_INSTANCE;
const dataSource = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST || 'localhost',
    username: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    port: instanceName ? undefined : parseInt(process.env.DB_PORT || '1433', 10),
    options: {
        encrypt: false,
        trustServerCertificate: true,
        ...(instanceName ? { instanceName } : {}),
    },
});

async function run() {
    console.log('Connecting to DB...');
    await dataSource.initialize();
    console.log('Connected.');

    // 1. Create table if not exists
    await dataSource.query(`
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

    // 2. Ensure companyAccountId column exists in account_transactions
    try {
        await dataSource.query('ALTER TABLE account_transactions ADD companyAccountId INT NULL');
        console.log('Column companyAccountId added to account_transactions');
    } catch (e: any) {
        if (e.message.includes('already exists')) {
            console.log('Column companyAccountId already exists');
        } else {
            console.error('Error adding column:', e.message);
        }
    }

    // 3. Insert sample data
    await dataSource.query(`
        INSERT INTO company_accounts (name, type, balance, currency, isActive, iban)
        VALUES 
        (N'Merkez Kasa', 'CASH', 15450.00, 'TL', 1, 'TR000000000000000000000001'),
        (N'Ziraat Bankası - Vadesiz', 'BANK', 45780.00, 'TL', 1, 'TR123456789012345678901234'),
        (N'Garanti POS Hesabı', 'BANK', 12300.00, 'TL', 1, 'TR987654321098765432109876'),
        (N'Yemeksepeti Alacaklar', 'CASH', 8900.00, 'TL', 1, NULL)
    `);
    console.log('Sample account records inserted');
    
    const latestAccounts = await dataSource.query('SELECT TOP 1 id FROM company_accounts ORDER BY id DESC');
    if (latestAccounts.length > 0) {
        const accId = latestAccounts[0].id;
        await dataSource.query(`
            INSERT INTO account_transactions (amount, type, description, sourceType, sourceId, paymentMethod, companyAccountId, createdAt)
            VALUES 
            (500, 'INCOME', 'Açılış Bakiyesi', 'TRANSFER', 0, 'KASA', ${accId}, GETDATE()),
            (120, 'EXPENSE', 'Ofis Malzemeleri', 'PAYMENT', 0, 'KASA', ${accId}, GETDATE()),
            (1500, 'INCOME', 'Günlük Ciro Aktarımı', 'SALE', 0, 'KASA', ${accId}, GETDATE())
        `);
        console.log('Sample transactions inserted');
    }

    await dataSource.destroy();
    console.log('Done.');
}

run().catch(err => {
    console.error('FATAL ERROR:', err.message);
    process.exit(1);
});
