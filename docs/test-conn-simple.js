const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const config = {
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
    server: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: process.env.DB_INSTANCE || undefined,
    },
    port: process.env.DB_INSTANCE ? undefined : parseInt(process.env.DB_PORT || '1433', 10),
    connectionTimeout: 30000,
    requestTimeout: 30000
};

async function testConnection() {
    try {
        console.log('Using config:', { ...config, password: '***' });
        console.log('Attempting to connect...');
        const pool = await sql.connect(config);
        console.log('Connected successfully!');

        console.log('Running simple query...');
        const result = await pool.request().query('SELECT 1 as test');
        console.log('Query result:', result.recordset);

        console.log('Closing connection...');
        await pool.close();
        console.log('Done!');
    } catch (err) {
        console.error('ERROR:', err.message);
        if (err.code) console.error('CODE:', err.code);
    }
}

testConnection();
