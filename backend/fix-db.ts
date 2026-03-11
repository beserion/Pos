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
    try {
        await dataSource.query('ALTER TABLE orders ADD discountAmount DECIMAL(12, 2) NOT NULL DEFAULT 0;');
        console.log('Successfully added discountAmount column.');
    } catch (err: any) {
        if (err.message && err.message.includes('already exists')) {
            console.log('Column discountAmount already exists in orders table.');
        } else {
            console.error('Error adding column:', err.message);
        }
    }
    try {
        await dataSource.query('ALTER TABLE orders ADD serviceFee DECIMAL(12, 2) NOT NULL DEFAULT 0;');
        console.log('Successfully added serviceFee column.');
    } catch (err: any) {
        if (err.message && err.message.includes('already exists')) {
            console.log('Column serviceFee already exists in orders table.');
        } else {
            console.error('Error adding column:', err.message);
        }
    }
    try {
        await dataSource.query('ALTER TABLE sales ADD discountAmount DECIMAL(12, 2) NOT NULL DEFAULT 0;');
        console.log('Successfully added discountAmount column to sales.');
    } catch (err: any) {
        if (err.message && err.message.includes('already exists')) {
            console.log('Column discountAmount already exists in sales table.');
        } else {
            console.error('Error adding column to sales:', err.message);
        }
    }
    try {
        await dataSource.query('ALTER TABLE sales ADD serviceFee DECIMAL(12, 2) NOT NULL DEFAULT 0;');
        console.log('Successfully added serviceFee column to sales.');
    } catch (err: any) {
        if (err.message && err.message.includes('already exists')) {
            console.log('Column serviceFee already exists in sales table.');
        } else {
            console.error('Error adding column to sales:', err.message);
        }
    }
    await dataSource.destroy();
}

run().catch(console.error);
