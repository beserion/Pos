const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35',
    database: 'AntigravityPOS',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        await sql.connect(config);

        console.log("Checking and adding columns...");

        const query = `
        -- Add currentTotal to tables if missing
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[tables]') AND name = 'currentTotal')
        BEGIN
            ALTER TABLE [dbo].[tables] ADD [currentTotal] DECIMAL(12,2) DEFAULT 0;
            PRINT 'Added currentTotal to tables';
        END

        -- Add pinCode to users if missing
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = 'pinCode')
        BEGIN
            ALTER TABLE [dbo].[users] ADD [pinCode] NVARCHAR(10);
            PRINT 'Added pinCode to users';
        END
        
        -- Update some sample pins for testing
        UPDATE [dbo].[users] SET [pinCode] = '1234' WHERE [email] = 'admin@test.com';
        UPDATE [dbo].[users] SET [pinCode] = '0000' WHERE [email] = 'user@test.com';

        PRINT 'Schema update completed.';
        `;

        const result = await sql.query(query);
        console.log("Result:", result);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sql.close();
    }
}

run();
