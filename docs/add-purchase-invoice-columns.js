// Migration: add invoice fields to purchase_orders table
const sql = require('mssql');
const config = {
    user: 'sa', password: 'YourStrong@Passw0rd', server: 'localhost',
    database: 'AntigravityPOS', options: { trustServerCertificate: true }
};
async function run() {
    await sql.connect(config);
    await sql.query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='purchase_orders' AND COLUMN_NAME='invoiceNumber')
            ALTER TABLE purchase_orders ADD invoiceNumber NVARCHAR(100) NULL;
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='purchase_orders' AND COLUMN_NAME='invoiceDate')
            ALTER TABLE purchase_orders ADD invoiceDate DATE NULL;
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='purchase_orders' AND COLUMN_NAME='invoiceAmount')
            ALTER TABLE purchase_orders ADD invoiceAmount DECIMAL(12,2) NULL;
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='purchase_orders' AND COLUMN_NAME='paymentStatus')
            ALTER TABLE purchase_orders ADD paymentStatus NVARCHAR(20) NOT NULL DEFAULT 'UNPAID';
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='purchase_orders' AND COLUMN_NAME='paymentMethod')
            ALTER TABLE purchase_orders ADD paymentMethod NVARCHAR(50) NULL;
    `);
    console.log('Migration: purchase_orders invoice fields added');
    sql.close();
}
run().catch(e => { console.error(e); sql.close(); });
