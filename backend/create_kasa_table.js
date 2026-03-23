const sql = require('mssql');
const config = {
  user: 'sa',
  password: 'Oryx123!',
  server: '149.34.201.35',
  database: 'AntigravityPOS',
  options: { encrypt: false }
};

const query = `
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='cash_registers' AND xtype='U')
BEGIN
    CREATE TABLE cash_registers (
        id INT PRIMARY KEY IDENTITY(1,1),
        name NVARCHAR(100) NOT NULL,
        isActive BIT DEFAULT 1,
        printerAddress NVARCHAR(MAX),
        locationId INT,
        cashierId INT,
        companyId INT DEFAULT 1,
        createdAt DATETIME DEFAULT GETDATE(),
        updatedAt DATETIME DEFAULT GETDATE()
    )
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
    console.log('Success: cash_registers table ensured.');
    process.exit(0);
  });
});
