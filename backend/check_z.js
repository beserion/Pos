const { DataSource } = require('typeorm');
require('dotenv').config();

const dataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST.split('\\')[0],
  extra: {
    instanceName: process.env.DB_HOST.split('\\')[1]
  },
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
});

async function check() {
  await dataSource.initialize();
  console.log('--- Last 5 Z-Reports ---');
  const zReports = await dataSource.query('SELECT TOP 5 id, businessDate, cashRegisterId, netSales, createdAt FROM z_reports ORDER BY createdAt DESC');
  console.table(zReports);
  
  console.log('--- Last 5 Business Day Logs ---');
  const logs = await dataSource.query('SELECT TOP 5 actionType, note, metadata, createdAt FROM business_day_logs ORDER BY createdAt DESC');
  console.table(logs);

  await dataSource.destroy();
}

check();
