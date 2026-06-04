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
  
  // Check products inventoryLinkType
  const products = await AppDataSource.query(`
    SELECT TOP 10 id, name, inventoryLinkType FROM products 
    WHERE isActive = 1
  `);
  console.log('Products sample:', products);

  // Check system_parameters for multipliers
  const params = await AppDataSource.query(`
    SELECT [key], value FROM system_parameters 
    WHERE [module] IN ('pos', 'half_double') AND [key] IN ('half_recipe_multiplier', 'double_recipe_multiplier')
  `);
  console.log('Parameters:', params);

  await AppDataSource.destroy();
}

run().catch(console.error);
