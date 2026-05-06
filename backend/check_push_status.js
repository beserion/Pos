const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function checkStatus() {
    try {
        await sql.connect(config);
        
        console.log('--- Push Subscriptions ---');
        const subs = await sql.query('SELECT userId, endpoint FROM push_subscriptions');
        console.table(subs.recordset);
        
        console.log('\n--- Alert Rules (KDS_MESSAGE_ACTIVE) ---');
        const rules = await sql.query("SELECT * FROM alert_rules WHERE eventKey = 'KDS_MESSAGE_ACTIVE'");
        console.table(rules.recordset);
        
        if (rules.recordset.length === 0) {
            console.log('\n[WARNING] KDS_MESSAGE_ACTIVE rule is MISSING! Creating default rule...');
            await sql.query(`
                INSERT INTO alert_rules (eventKey, isActive, severity, displayMode, targetType, description)
                VALUES ('KDS_MESSAGE_ACTIVE', 1, 'INFO', 'LIST', 'ALL', 'Sipariş hazır bildirimi')
            `);
            console.log('Default rule created.');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit(0);
    }
}
checkStatus();
