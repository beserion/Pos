import * as sql from 'mssql';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        const pool = await sql.connect({
            user: process.env.DB_USERNAME || 'sa',
            password: process.env.DB_PASSWORD || 'Oryx123!',
            server: process.env.DB_HOST || '149.34.201.35',
            database: process.env.DB_DATABASE || 'AntigravityPOS',
            port: parseInt(process.env.DB_PORT || '1433', 10),
            options: {
                encrypt: true,
                trustServerCertificate: true
            }
        });
        
        console.log('Connected to DB...');
        
        // 1. Set 0 values to NULL to fix foreign key constraints
        await pool.request().query('UPDATE output_profiles SET infoPrinterId = NULL WHERE infoPrinterId = 0');
        await pool.request().query('UPDATE output_profiles SET mainPrinterId = NULL WHERE mainPrinterId = 0');
        console.log('Updated 0s to NULL');

        await pool.close();
        console.log('Done!');
        process.exit(0);
    } catch (err) {
        console.error('Failed to run migration:', err);
        process.exit(1);
    }
}

run();
