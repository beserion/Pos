const mssql = require('mssql');
require('dotenv').config();

async function test() {
    console.log('Testing connection to:', process.env.DB_HOST);
    try {
        const config = {
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_HOST || 'localhost',
            database: process.env.DB_DATABASE,
            options: {
                encrypt: false,
                trustServerCertificate: true
            }
        };
        console.log('Config:', JSON.stringify({ ...config, password: '***' }, null, 2));
        const conn = await mssql.connect(config);
        console.log('SUCCESS!');
        await conn.close();
    } catch (err) {
        console.error('CONNECTION FAILED:');
        console.error(err);
    }
}

test();
