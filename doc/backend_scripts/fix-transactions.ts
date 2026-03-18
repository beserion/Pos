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

  // Delete all existing transactions for these specific accounts to start fresh
  await dataSource.query('DELETE FROM account_transactions WHERE companyAccountId IN (1, 2, 3, 4)');

  const transactions = [
    // Merkez Kasa (Target: 15450)
    { accId: 1, amount: 10000, type: 'INCOME', desc: 'Devir Bakiyesi', source: 'TRANSFER', method: 'KASA', partner: null },
    { accId: 1, amount: 7500, type: 'INCOME', desc: 'Günlük Kasa Satışı', source: 'SALE', method: 'KASA', partner: null },
    { accId: 1, amount: 2050, type: 'EXPENSE', desc: 'Elektrik ve Su Faturası', source: 'PAYMENT', method: 'KASA', partner: null },

    // Ziraat Bankası (Target: 45780)
    { accId: 2, amount: 40000, type: 'INCOME', desc: 'Bank Vadesiz Bakiyesi', source: 'TRANSFER', method: 'BANKA', partner: null },
    { accId: 2, amount: 8280, type: 'INCOME', desc: 'Müşteri Tahsilatı (EFT)', source: 'PAYMENT', method: 'BANKA', partner: 5 },
    { accId: 2, amount: 2500, type: 'EXPENSE', desc: 'Tedarikçi Ödemesi', source: 'PAYMENT', method: 'BANKA', partner: 1 },

    // Garanti POS (Target: 12300)
    { accId: 3, amount: 10000, type: 'INCOME', desc: 'Açılış Bakiyesi', source: 'TRANSFER', method: 'KREDI_KARTI', partner: null },
    { accId: 3, amount: 2300, type: 'INCOME', desc: 'Haftasonu POS Ciro', source: 'SALE', method: 'KREDI_KARTI', partner: null },

    // Yemeksepeti Alacaklar (Target: 8900)
    { accId: 4, amount: 8900, type: 'INCOME', desc: 'Yemeksepeti Bekleyen Tahsilat', source: 'SALE', method: 'KASA', partner: null },
  ];

  for (const t of transactions) {
    const partnerVal = t.partner === null ? 'NULL' : t.partner;
    await dataSource.query(`
      INSERT INTO account_transactions 
      (amount, type, description, sourceType, sourceId, paymentMethod, companyAccountId, partnerId, createdAt, updatedAt)
      VALUES 
      (${t.amount}, '${t.type}', N'${t.desc}', '${t.source}', 0, '${t.method}', ${t.accId}, ${partnerVal}, GETDATE(), GETDATE())
    `);
  }

  console.log('Transactions synchronized with balances.');
  await dataSource.destroy();
}

run().catch(console.error);
