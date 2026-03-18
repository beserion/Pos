import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST || 'localhost',
    username: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'Oryx123!',
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
});

async function run() {
    await dataSource.initialize();
    console.log('Connected to DB.');
    const printers = await dataSource.query('SELECT * FROM printers');
    console.log('Printers:', JSON.stringify(printers, null, 2));
    await dataSource.destroy();
}

run().catch(console.error);
