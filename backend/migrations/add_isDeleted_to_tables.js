const sql = require('mssql');
const config = {
  user: 'sa',
  password: 'Oryx123!',
  server: '149.34.201.35',
  database: 'AntigravityPOS',
  options: { encrypt: false }
};

const query = `
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tables') AND name = 'isDeleted')
BEGIN
    ALTER TABLE tables ADD isDeleted BIT NOT NULL DEFAULT 0
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
    console.log('Column isDeleted added successfully to tables table.');
    process.exit(0);
  });
});
