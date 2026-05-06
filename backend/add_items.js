require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function seedItems() {
  try {
    await sql.connect(config);
    const q = await sql.query`SELECT TOP 1 * FROM reservations`;
    if (q.recordset.length > 0) {
       console.log("RESERVATIONS COLUMNS:", Object.keys(q.recordset[0]));
    } else {
       const schema = await sql.query`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='reservations'`;
       console.log("RESERVATIONS COLUMNS:", schema.recordset.map(x => x.COLUMN_NAME));
    }
  } catch(e) {
    console.log(e);
  }
  process.exit();
}
seedItems();
