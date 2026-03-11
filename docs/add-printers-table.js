const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35',
    database: 'AntigravityPOS',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function addPrintersTable() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);

        console.log('Creating printers table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='printers' and xtype='U')
            BEGIN
                CREATE TABLE printers (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    name NVARCHAR(255) NOT NULL,
                    ipAddress NVARCHAR(255) NULL,
                    isActive BIT NOT NULL DEFAULT 1,
                    createdAt DATETIME NOT NULL DEFAULT GETDATE(),
                    updatedAt DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT 'printers table created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'printers table already exists.';
            END
        `);

        console.log('Done.');
        await pool.close();
    } catch (err) {
        console.error('Error creating printers table:', err.message);
    }
}

addPrintersTable();
