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

async function addPermissionsColumn() {
    try {
        console.log('Connecting to database 149.34.201.35...');
        const pool = await sql.connect(config);

        console.log('Adding permissions column to roles table...');
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE Name = N'permissions' AND Object_ID = Object_ID(N'roles')
            )
            BEGIN
                ALTER TABLE roles
                ADD permissions NVARCHAR(MAX) NULL;
                PRINT 'Column added successfully!';
            END
            ELSE
            BEGIN
                PRINT 'Column already exists.';
            END
        `);

        await pool.close();
        console.log('Done.');
    } catch (err) {
        console.error('Error adding column:', err.message);
    }
}

addPermissionsColumn();
