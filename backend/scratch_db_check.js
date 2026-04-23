const sql = require('mssql');
require('dotenv').config();

async function run() {
  try {
    await sql.connect({
      user: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
      server: process.env.DB_HOST || 'localhost',
      database: process.env.DB_DATABASE || 'AntigravityPOS',
      options: {
        encrypt: true,
        trustServerCertificate: true,
      }
    });

    const result = await sql.query`SELECT id, firstName, lastName, roleId, pinCode FROM Users`;
    console.log("Users and their PINs:");
    console.table(result.recordset);
    
    // Also check wait-posnetx if relevant, but let's just see this db
  } catch (err) {
    console.error(err);
  } finally {
    await sql.close();
  }
}
run();
