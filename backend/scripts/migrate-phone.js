const sql = require('mssql');
require('dotenv').config();
const cfg = {
  server: process.env.DB_HOST, port: +process.env.DB_PORT,
  user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  options: { encrypt: true, trustServerCertificate: true }
};
sql.connect(cfg).then(async pool => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID(N'users') AND name=N'phone')
    BEGIN ALTER TABLE users ADD phone NVARCHAR(30) NULL; PRINT 'phone added'; END
    ELSE PRINT 'phone already exists';
  `);
  console.log('[Migration] users.phone: OK');
  pool.close();
}).catch(e => { console.error(e.message); process.exit(1); });
