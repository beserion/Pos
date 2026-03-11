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

async function createMissingTables() {
    try {
        console.log('Connecting to database 149.34.201.35...');
        const pool = await sql.connect(config);

        console.log('Creating [orders] table if not exists...');
        await pool.request().query(`
            IF OBJECT_ID(N'[dbo].[orders]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[orders] (
                    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [status] nvarchar(255) NOT NULL DEFAULT 'NEW',
                    [totalAmount] decimal(12,2) NOT NULL DEFAULT 0,
                    [note] nvarchar(MAX) NULL,
                    [tableId] int NULL FOREIGN KEY REFERENCES [dbo].[tables]([id]),
                    [waiterId] int NULL FOREIGN KEY REFERENCES [dbo].[users]([id]),
                    [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
                    [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
                );
                PRINT 'orders created.'
            END
        `);

        console.log('Creating [order_items] table if not exists...');
        await pool.request().query(`
            IF OBJECT_ID(N'[dbo].[order_items]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[order_items] (
                    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [quantity] decimal(10,2) NOT NULL,
                    [unitPrice] decimal(10,2) NOT NULL,
                    [note] nvarchar(MAX) NULL,
                    [orderId] int NULL FOREIGN KEY REFERENCES [dbo].[orders]([id]) ON DELETE CASCADE,
                    [productId] int NULL FOREIGN KEY REFERENCES [dbo].[products]([id])
                );
                PRINT 'order_items created.'
            END
        `);

        await pool.close();
        console.log('Done creating tables.');
    } catch (err) {
        console.error('Error creating tables:', err.message);
    }
}

createMissingTables();
