import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  console.log('Connecting to DB with:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    pass: process.env.DB_PASSWORD,
    db: process.env.DB_DATABASE
  });
  
  const connection = await createConnection({
    type: 'mssql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '1433'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: false,
    extra: {
        trustServerCertificate: true
    }
  });

  console.log('Connected.');
  
  try {
      await connection.query('ALTER TABLE account_transactions ADD companyAccountId INT NULL');
      console.log('Added companyAccountId to account_transactions');
  } catch (e: any) {
      console.log('Error adding column:', e.message);
  }

  await connection.close();
}

run().catch(console.error);
