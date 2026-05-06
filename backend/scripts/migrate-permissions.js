/**
 * Migration script: adds extraPermissions column to users table
 * and creates permission_modules table if not exists.
 * Run: node scripts/migrate-permissions.js
 */

const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '1433'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

async function run() {
    const pool = await sql.connect(config);
    console.log('[Migration] Connected to DB:', process.env.DB_DATABASE);

    // 1. Add extraPermissions column to users table
    await pool.request().query(`
        IF NOT EXISTS (
            SELECT * FROM sys.columns
            WHERE object_id = OBJECT_ID(N'users')
            AND name = N'extraPermissions'
        )
        BEGIN
            ALTER TABLE users ADD extraPermissions NVARCHAR(2000) NULL;
            PRINT 'Column extraPermissions added to users table.';
        END
        ELSE
        BEGIN
            PRINT 'Column extraPermissions already exists.';
        END
    `);
    console.log('[Migration] users.extraPermissions: OK');

    // 2. Create permission_modules table if not exists
    await pool.request().query(`
        IF NOT EXISTS (
            SELECT * FROM sysobjects
            WHERE name = 'permission_modules' AND xtype = 'U'
        )
        BEGIN
            CREATE TABLE permission_modules (
                id         INT IDENTITY(1,1) PRIMARY KEY,
                [key]      NVARCHAR(100)  NOT NULL UNIQUE,
                label      NVARCHAR(200)  NOT NULL,
                icon       NVARCHAR(100)  NOT NULL DEFAULT 'fa-cube',
                color      NVARCHAR(100)  NOT NULL DEFAULT 'text-blue-500',
                accent_bg  NVARCHAR(100)  NOT NULL DEFAULT 'bg-blue-500/10',
                actions    NVARCHAR(500)  NOT NULL DEFAULT 'VIEW',
                sort_order INT            NOT NULL DEFAULT 99,
                createdAt  DATETIME2      NOT NULL DEFAULT GETDATE(),
                updatedAt  DATETIME2      NOT NULL DEFAULT GETDATE()
            );
            PRINT 'Table permission_modules created.';
        END
        ELSE
        BEGIN
            PRINT 'Table permission_modules already exists.';
        END
    `);
    console.log('[Migration] permission_modules table: OK');

    await pool.close();
    console.log('[Migration] Done.');
}

run().catch(err => {
    console.error('[Migration] ERROR:', err.message);
    process.exit(1);
});
