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

async function addUsersColumns() {
    try {
        console.log('Connecting to database 149.34.201.35...');
        const pool = await sql.connect(config);

        console.log('Adding passwordClearText and pinCode to users table...');
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE Name = N'passwordClearText' AND Object_ID = Object_ID(N'users')
            )
            BEGIN
                ALTER TABLE users ADD passwordClearText NVARCHAR(255) NULL;
                PRINT 'passwordClearText added.';
            END

            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE Name = N'pinCode' AND Object_ID = Object_ID(N'users')
            )
            BEGIN
                ALTER TABLE users ADD pinCode NVARCHAR(10) NULL;
                PRINT 'pinCode added.';
            END
        `);

        await pool.close();
        console.log('Done.');
    } catch (err) {
        console.error('Error adding columns:', err.message);
    }
}

addUsersColumns();
