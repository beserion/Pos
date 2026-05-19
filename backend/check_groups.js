const { DataSource } = require('typeorm');
const dotenv = require('dotenv');
dotenv.config();

const AppDataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  username: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD || 'your_password',
  database: process.env.DB_DATABASE || 'pos_db',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
});

async function run() {
  await AppDataSource.initialize();

  console.log("\n--- PRODUCTS WITH CATEGORIES ---");
  const prods = await AppDataSource.query(`
    SELECT id, name, category, createdAt, updatedAt FROM products WHERE category IS NOT NULL
  `);
  console.log(prods);

  await AppDataSource.destroy();
}

run().catch(console.error);
