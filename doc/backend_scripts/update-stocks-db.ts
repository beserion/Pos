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
    
    // Add barcode column
    try {
        await dataSource.query("ALTER TABLE stocks ADD barcode nvarchar(255) NULL;");
        console.log('Successfully added barcode column to stocks.');
    } catch (err: any) {
        if (err.message && err.message.includes('already exists')) {
            console.log('Column barcode already exists in stocks table.');
        } else {
            console.error('Error adding barcode column:', err.message);
        }
    }

    // Add description column
    try {
        await dataSource.query("ALTER TABLE stocks ADD description nvarchar(MAX) NULL;");
        console.log('Successfully added description column to stocks.');
    } catch (err: any) {
        if (err.message && err.message.includes('already exists')) {
            console.log('Column description already exists in stocks table.');
        } else {
            console.error('Error adding description column:', err.message);
        }
    }

    await dataSource.destroy();
}

run().catch(console.error);
