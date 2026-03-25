import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';

const instanceName = process.env.DB_INSTANCE;
const dataSource = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST || 'localhost',
    username: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    port: instanceName ? undefined : parseInt(process.env.DB_PORT || '1433', 10),
    options: {
        encrypt: false,
        trustServerCertificate: true,
        ...(instanceName ? { instanceName } : {}),
    },
});

async function run() {
    await dataSource.initialize();
    console.log('Connected to DB.');
    const result = await dataSource.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'stocks'
    `);
    console.log('Current stocks columns:', result.map((r: any) => r.COLUMN_NAME));
    await dataSource.destroy();
}

run().catch(console.error);
