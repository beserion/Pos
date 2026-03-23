const sql = require('mssql');
const config = {
  user: 'sa',
  password: 'Oryx123!',
  server: '149.34.201.35',
  database: 'AntigravityPOS',
  options: { encrypt: false }
};

const query = `
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'departments')
BEGIN
    CREATE TABLE departments (
        id INT PRIMARY KEY IDENTITY(1,1),
        name NVARCHAR(255) NOT NULL,
        locationId INT NULL,
        isActive BIT DEFAULT 1,
        createdAt DATETIME2 DEFAULT GETDATE(),
        updatedAt DATETIME2 DEFAULT GETDATE()
    )
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('cash_registers') AND name = 'zoneIds')
BEGIN
    ALTER TABLE cash_registers ADD zoneIds NVARCHAR(MAX) NULL
END
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('cash_registers') AND name = 'departmentIds')
BEGIN
    ALTER TABLE cash_registers DROP COLUMN departmentIds
END

-- Seed departments if empty
IF NOT EXISTS (SELECT 1 FROM departments)
BEGIN
    INSERT INTO departments (name, isActive) VALUES ('Mutfak', 1), ('Bar', 1), ('Salon', 1), ('Paket Servis', 1)
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
    console.log('Departments table ensured and cash_registers updated.');
    process.exit(0);
  });
});
