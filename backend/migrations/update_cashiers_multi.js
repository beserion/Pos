const sql = require('mssql');
const config = {
  user: 'sa',
  password: 'Oryx123!',
  server: '149.34.201.35',
  database: 'AntigravityPOS',
  options: { encrypt: false }
};

const query = `
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('cash_registers') AND name = 'cashierId')
BEGIN
    ALTER TABLE cash_registers DROP COLUMN cashierId
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('cash_registers') AND name = 'cashierIds')
BEGIN
    ALTER TABLE cash_registers ADD cashierIds NVARCHAR(MAX) NULL
END
`;

sql.connect(config, err => {
  if (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
  new sql.Request().query(query, (err, result) => {
    if (err) {
      console.error('Query error:', err);
      process.exit(1);
    }
    console.log('Column cashierIds (multi) ensured on cash_registers table.');
    process.exit(0);
  });
});
