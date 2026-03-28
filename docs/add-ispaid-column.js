// Migration: adds isPaid column to order_items table
// Run once with: node add-ispaid-column.js
const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'YourStrong@Passw0rd',
    server: 'localhost',
    database: 'AntigravityPOS',
    options: { trustServerCertificate: true }
};

async function run() {
    try {
        await sql.connect(config);
        const result = await sql.query(`
            IF NOT EXISTS (
                SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'order_items' AND COLUMN_NAME = 'isPaid'
            )
            BEGIN
                ALTER TABLE order_items ADD isPaid BIT NOT NULL DEFAULT 0;
                PRINT 'isPaid column added';
            END
            ELSE
            BEGIN
                PRINT 'isPaid column already exists - skipping';
            END
        `);
        console.log('Migration complete:', result);
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        sql.close();
    }
}

run();
