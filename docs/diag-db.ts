import * as mssql from 'mssql';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log('Testing connection to:', process.env.DB_HOST);
    try {
        const conn = await mssql.connect({
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_HOST || 'localhost',
            database: process.env.DB_DATABASE,
            options: {
                encrypt: false,
                trustServerCertificate: true
            }
        });
        console.log('SUCCESS!');
        await conn.close();
    } catch (err) {
        console.error('CONNECTION FAILED:');
        console.error(err);
    }
}

test();
