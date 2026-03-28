const sql = require('mssql');
require('dotenv').config();
const c = {
  server: process.env.DB_HOST, port: +process.env.DB_PORT,
  user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  options: { encrypt: true, trustServerCertificate: true }
};
sql.connect(c).then(p =>
  p.request().query('SELECT id, name, permissions FROM roles ORDER BY id')
  .then(r => {
    r.recordset.forEach(x => console.log(x.id, '|', x.name, '|', x.permissions));
    p.close();
  })
).catch(e => { console.error(e.message); process.exit(1); });
