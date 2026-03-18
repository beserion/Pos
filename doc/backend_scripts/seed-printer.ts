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
    
    // Check if "Kasa" printer already exists
    const existing = await dataSource.query("SELECT * FROM printers WHERE LOWER(name) = 'kasa'");
    
    if (existing.length === 0) {
        await dataSource.query(`
            INSERT INTO printers (name, location, ipAddress, isActive, createdAt, updatedAt)
            VALUES ('Kasa', 'Kasa', '127.0.0.1', 1, GETDATE(), GETDATE())
        `);
        console.log('Added default "Kasa" printer with IP 127.0.0.1');
    } else {
        console.log('"Kasa" printer already exists.');
    }
    
    await dataSource.destroy();
}

run().catch(console.error);
