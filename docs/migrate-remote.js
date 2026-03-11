require('dotenv').config();
const mssql = require('mssql');

const cfg = {
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'Oryx123!',
    server: process.env.DB_HOST || '149.34.201.35',
    port: parseInt(process.env.DB_PORT || '1433'),
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    options: { encrypt: false, trustServerCertificate: true, connectTimeout: 30000 },
};

async function migrate() {
    await mssql.connect(cfg);
    console.log('Connected. Running migrations...');

    const migrations = [
        // purchase_orders - invoice fields
        `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='purchase_orders' AND COLUMN_NAME='invoiceNumber')
            ALTER TABLE purchase_orders ADD invoiceNumber NVARCHAR(100) NULL`,
        `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='purchase_orders' AND COLUMN_NAME='invoiceDate')
            ALTER TABLE purchase_orders ADD invoiceDate DATE NULL`,
        `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='purchase_orders' AND COLUMN_NAME='invoiceAmount')
            ALTER TABLE purchase_orders ADD invoiceAmount DECIMAL(12,2) NULL`,
        `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='purchase_orders' AND COLUMN_NAME='paymentStatus')
            ALTER TABLE purchase_orders ADD paymentStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_po_paymentStatus DEFAULT 'UNPAID'`,
        `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='purchase_orders' AND COLUMN_NAME='paymentMethod')
            ALTER TABLE purchase_orders ADD paymentMethod NVARCHAR(50) NULL`,
        // order_items - isPaid field
        `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='order_items' AND COLUMN_NAME='isPaid')
            ALTER TABLE order_items ADD isPaid BIT NOT NULL CONSTRAINT DF_oi_isPaid DEFAULT 0`,
        // partners table
        `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='partners')
            CREATE TABLE partners (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(200) NOT NULL,
                type NVARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
                contactName NVARCHAR(200) NULL,
                email NVARCHAR(200) NULL,
                phone NVARCHAR(50) NULL,
                address NVARCHAR(500) NULL,
                city NVARCHAR(100) NULL,
                taxNumber NVARCHAR(50) NULL,
                taxOffice NVARCHAR(100) NULL,
                creditLimit DECIMAL(12,2) NOT NULL DEFAULT 0,
                currentBalance DECIMAL(12,2) NOT NULL DEFAULT 0,
                isActive BIT NOT NULL DEFAULT 1,
                createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
                updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
            )`,
        // account_transactions table
        `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='account_transactions')
            CREATE TABLE account_transactions (
                id INT IDENTITY(1,1) PRIMARY KEY,
                amount DECIMAL(12,2) NOT NULL,
                type NVARCHAR(20) NOT NULL,
                description NVARCHAR(500) NULL,
                sourceType NVARCHAR(50) NULL,
                sourceId INT NULL,
                paymentMethod NVARCHAR(50) NULL DEFAULT 'KASA',
                category NVARCHAR(100) NULL,
                partnerId INT NULL,
                createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
                updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
            )`,
    ];

    for (const sql of migrations) {
        try {
            await mssql.query(sql);
            console.log('OK:', sql.trim().substring(0, 70) + '...');
        } catch (e) {
            console.error('SKIP/ERR:', e.message.substring(0, 120));
        }
    }

    console.log('\nAll migrations done!');
    mssql.close();
}

migrate().catch(e => { console.error('FATAL:', e.message); mssql.close(); });
