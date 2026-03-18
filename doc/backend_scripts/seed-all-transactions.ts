import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const dataSource = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  });

  await dataSource.initialize();
  console.log('Connected.');

  // Get all active company accounts
  const accounts = await dataSource.query('SELECT id, name FROM company_accounts WHERE isActive = 1');
  console.log(`Found ${accounts.length} accounts.`);

  const transactionTemplates = [
    { amount: 5000, type: 'INCOME', desc: 'Açılış Devir Bakiyesi', source: 'TRANSFER', method: 'KASA', docNum: 'DEV-2024-001' },
    { amount: 1250, type: 'INCOME', desc: 'Günlük Satış Cirosu', source: 'SALE', method: 'KASA', docNum: 'Z-00142' },
    { amount: 450, type: 'EXPENSE', desc: 'Kırtasiye ve Ofis Giderleri', source: 'PAYMENT', method: 'KASA', docNum: 'FAT-882' },
    { amount: 2800, type: 'INCOME', desc: 'Müşteri Ödemesi Tahsilat', source: 'PAYMENT', method: 'BANKA', docNum: 'EFT-9912' },
    { amount: 950, type: 'EXPENSE', desc: 'Personel Yemek Ödemesi', source: 'PAYMENT', method: 'KASA', docNum: 'FIS-0032' },
  ];

  for (const acc of accounts) {
    console.log(`Adding transactions for: ${acc.name} (ID: ${acc.id})`);
    
    // First, let's clear existing sample transactions for this account to avoid duplication if re-run
    // Only if they were created by this seeder logic (optional, but safer to just add more)
    
    for (const t of transactionTemplates) {
      await dataSource.query(`
        INSERT INTO account_transactions 
        (amount, type, description, sourceType, sourceId, paymentMethod, companyAccountId, partnerId, documentNumber, createdAt, updatedAt)
        VALUES 
        (${t.amount}, '${t.type}', N'${acc.name} - ${t.desc}', '${t.source}', 0, '${t.method}', ${acc.id}, NULL, '${t.docNum}', GETDATE(), GETDATE())
      `);
    }
  }

  console.log('Successfully added transactions to all company accounts.');
  await dataSource.destroy();
}

run().catch(console.error);
