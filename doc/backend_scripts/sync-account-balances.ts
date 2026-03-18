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

  // Get all company accounts
  const accounts = await dataSource.query('SELECT id, name FROM company_accounts');
  console.log(`Processing ${accounts.length} accounts...`);

  for (const acc of accounts) {
    // Calculate total income and expense for this account
    // type: 'INCOME' or 'EXPENSE'
    const result = await dataSource.query(`
      SELECT 
        SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as totalIncome,
        SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as totalExpense
      FROM account_transactions 
      WHERE companyAccountId = ${acc.id}
    `);

    const totalIncome = parseFloat(result[0].totalIncome || 0);
    const totalExpense = parseFloat(result[0].totalExpense || 0);
    const newBalance = totalIncome - totalExpense;

    console.log(`Account: ${acc.name} (ID: ${acc.id}) | Income: ${totalIncome} | Expense: ${totalExpense} | New Balance: ${newBalance}`);

    // Update the account balance
    await dataSource.query(`
      UPDATE company_accounts 
      SET balance = ${newBalance}, updatedAt = GETDATE()
      WHERE id = ${acc.id}
    `);
  }

  console.log('Successfully synchronized all account balances with transaction history.');
  await dataSource.destroy();
}

run().catch(console.error);
