const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35',
    database: 'AntigravityPOS',
    port: 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function migrate() {
    try {
        await sql.connect(config);
        console.log('Connected to DB');

        const query1 = \`
            IF COL_LENGTH('sales', 'paidAmountCash') IS NULL
            BEGIN
                ALTER TABLE sales ADD paidAmountCash DECIMAL(12,2) DEFAULT 0;
            END
        \`;

        const query2 = \`
            IF COL_LENGTH('sales', 'paidAmountCreditCard') IS NULL
            BEGIN
                ALTER TABLE sales ADD paidAmountCreditCard DECIMAL(12,2) DEFAULT 0;
            END
        \`;

        await sql.query(query1);
        console.log('Added paidAmountCash column recursively');
        
        await sql.query(query2);
        console.log('Added paidAmountCreditCard column recursively');

        console.log('Migration successful');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
