const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35',
    database: 'AntigravityPOS',
    port: 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    // Required to increase the limit to send very large batches
    requestTimeout: 120000
};

async function migrateRemote() {
    try {
        console.log('Connecting to remote server 149.34.201.35...');

        // Connect without database first, to ensure the DB exists
        const masterConfig = { ...config, database: 'master' };
        let pool = await sql.connect(masterConfig);

        console.log('Checking if AntigravityPOS exists...');
        const dbCheck = await pool.request().query("SELECT name FROM sys.databases WHERE name = 'AntigravityPOS'");

        if (dbCheck.recordset.length === 0) {
            console.log('Creating database AntigravityPOS...');
            await pool.request().query("CREATE DATABASE [AntigravityPOS]");
            console.log('Database created.');
        } else {
            console.log('Database AntigravityPOS already exists.');
        }
        await pool.close();

        // Connect to AntigravityPOS
        console.log('Connecting to AntigravityPOS DB...');
        pool = await sql.connect(config);

        const sqlFilePath = path.join(__dirname, '..', 'AntigravityPOS_Migration.sql');
        console.log(`Reading SQL file from ${sqlFilePath}`);
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        // Split by "GO" because mssql query doesn't like GO batches
        const batches = sqlContent.split(/^GO\s*$/im);

        console.log(`Running ${batches.length} batches...`);
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            if (batch.length > 0) {
                try {
                    await pool.request().batch(batch);
                } catch (batchErr) {
                    console.error(`Error in batch ${i + 1}:`, batchErr.message);
                }
            }
        }

        console.log('Migration successfully completed on remote server!');
        await pool.close();
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrateRemote();
