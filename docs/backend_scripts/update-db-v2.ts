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

async function addColumn(table: string, column: string, type: string) {
    try {
        await dataSource.query(`ALTER TABLE ${table} ADD ${column} ${type};`);
        console.log(`Successfully added ${column} to ${table}.`);
    } catch (err: any) {
        if (err.message && (err.message.includes('already exists') || err.message.includes('Column names in each table must be unique'))) {
            console.log(`Column ${column} already exists in ${table}.`);
        } else {
            console.error(`Error adding ${column} to ${table}:`, err.message);
        }
    }
}

async function run() {
    await dataSource.initialize();
    console.log('Connected to DB.');

    // Orders table updates
    await addColumn('orders', 'tableName', 'NVARCHAR(255) NULL');
    await addColumn('orders', 'paymentMethod', 'NVARCHAR(255) NULL');
    await addColumn('orders', 'paidAmountCash', 'DECIMAL(12, 2) NULL DEFAULT 0');
    await addColumn('orders', 'paidAmountCreditCard', 'DECIMAL(12, 2) NULL DEFAULT 0');
    await addColumn('orders', 'partnerId', 'INT NULL');

    // Account Transactions table updates (if missing)
    await addColumn('account_transactions', 'sourceType', 'NVARCHAR(255) NULL');
    await addColumn('account_transactions', 'sourceId', 'INT NULL');
    await addColumn('account_transactions', 'paymentMethod', "NVARCHAR(255) NULL DEFAULT 'KASA'");
    await addColumn('account_transactions', 'category', 'NVARCHAR(255) NULL');
    await addColumn('account_transactions', 'partnerId', 'INT NULL');

    await dataSource.destroy();
}

run().catch(console.error);
