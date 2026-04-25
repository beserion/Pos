const { DataSource } = require('typeorm');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

async function checkDb() {
  const ds = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST || 'localhost',
    username: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    options: {
      encrypt: true,
      trustServerCertificate: true,
      instanceName: process.env.DB_INSTANCE
    }
  });

  try {
    await ds.initialize();
    console.log('✅ Connected to DB');
    
    const tables = await ds.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
    console.log('Tables:', tables.map(t => t.TABLE_NAME).join(', '));
    
    if (tables.find(t => t.TABLE_NAME === 'invoices')) {
      const columns = await ds.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'invoices'");
      console.log('Invoices Columns:', columns);
    } else {
      console.log('❌ invoices table not found!');
    }
    
    await ds.destroy();
  } catch (err) {
    console.error('❌ DB Error:', err.message);
  }
}

checkDb();
