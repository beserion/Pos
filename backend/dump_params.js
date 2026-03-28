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
  new sql.Request().query("SELECT [key], [value] FROM system_parameters WHERE [key] = 'kitchen_finished_screen_timeout'", (err, result) => {
    if (err) {
      console.error('Query error:', err);
      process.exit(1);
    }
    console.log('Result:', JSON.stringify(result.recordset, null, 2));
    process.exit(0);
  });
});
