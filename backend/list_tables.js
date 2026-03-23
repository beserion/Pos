const sql = require('mssql');
const config = {
  user: 'sa',
  password: 'Oryx123!',
  server: '149.34.201.35',
  database: 'AntigravityPOS',
  options: { encrypt: false }
};

sql.connect(config, err => {
  if (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
  new sql.Request().query("SELECT name FROM sys.tables ORDER BY name", (err, result) => {
    if (err) {
      console.error('Query error:', err);
      process.exit(1);
    }
    console.log('--- TABLES ---');
    console.log(result.recordset.map(r => r.name).join('\n'));
    process.exit(0);
  });
});
