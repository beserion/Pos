const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const config = {
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
    server: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: process.env.DB_INSTANCE || undefined,
    },
    port: process.env.DB_INSTANCE ? undefined : parseInt(process.env.DB_PORT || '1433', 10)
};

const createTableSql = `
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'reservations')
BEGIN
    CREATE TABLE reservations (
        id INT PRIMARY KEY IDENTITY(1,1),
        customerName NVARCHAR(255) NOT NULL,
        customerPhone NVARCHAR(50) NOT NULL,
        reservationTime DATETIME2 NOT NULL,
        guestCount INT DEFAULT 1,
        tableId INT NULL,
        locationId INT NULL,
        notes NVARCHAR(MAX),
        status NVARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'ARRIVED')),
        createdAt DATETIME2 DEFAULT GETDATE(),
        updatedAt DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Table reservations created successfully.';
END
`;

const addConstraintsSql = `
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Reservations_Tables')
BEGIN
    ALTER TABLE reservations ADD CONSTRAINT FK_Reservations_Tables FOREIGN KEY (tableId) REFERENCES tables(id) ON DELETE SET NULL;
    PRINT 'Constraint FK_Reservations_Tables added.';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Reservations_Locations')
BEGIN
    ALTER TABLE reservations ADD CONSTRAINT FK_Reservations_Locations FOREIGN KEY (locationId) REFERENCES locations(id) ON DELETE SET NULL;
    PRINT 'Constraint FK_Reservations_Locations added.';
END
`;

async function executeMigration() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);
        console.log('Connected successfully!');

        console.log('Executing Table Creation...');
        await pool.request().query(createTableSql);

        console.log('Executing Constraint Addition...');
        await pool.request().query(addConstraintsSql);

        console.log('Migration execution finished.');
        await pool.close();
    } catch (err) {
        console.error('Migration failed:', err.message);
    }
}

async function addMissingConstraint() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);
        console.log('Connected successfully!');

        console.log('Adding Location Constraint...');
        const sqlSql = `ALTER TABLE [dbo].[reservations] ADD CONSTRAINT [FK_Reservations_Locations] FOREIGN KEY ([locationId]) REFERENCES [dbo].[locations]([id]) ON DELETE SET NULL;`;
        await pool.request().query(sqlSql);
        console.log('Location Constraint added successfully!');

        await pool.close();
    } catch (err) {
        console.error('Migration failed:', err.message);
    }
}

addMissingConstraint();
