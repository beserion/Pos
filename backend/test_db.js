const sql = require('mssql');
const config = {
  user: 'sa',
  password: 'Oryx123!',
  server: '149.34.201.35',
  database: 'AntigravityPOS',
  options: { encrypt: false }
};
sql.connect(config, err => {
  if (err) console.error(err);
  new sql.Request().query('SELECT * FROM system_parameters WHERE module=\'kds\'', (err, result) => {
    if (err) console.error(err);
    console.log(result.recordset);
    process.exit();
  });
});
