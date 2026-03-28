const { DataSource } = require('typeorm');
const path = require('path');

async function syncRemoteDB() {
    const AppDataSource = new DataSource({
        type: 'mssql',
        host: '149.34.201.35',
        port: 1433,
        username: 'sa',
        password: 'Oryx123!',
        database: 'AntigravityPOS',
        entities: [path.join(__dirname, 'dist/**/*.entity.js')],
        synchronize: true, // This will auto-create missing tables and columns!
        options: { encrypt: false, trustServerCertificate: true },
        logging: true,
    });

    try {
        console.log('Synchronizing remote database at 149.34.201.35...');
        await AppDataSource.initialize();
        console.log('Synchronization successful! All missing tables created.');
    } catch (err) {
        console.error('Sync failed:', err);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
    }
}

syncRemoteDB();
