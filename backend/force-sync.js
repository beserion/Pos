const { DataSource } = require('typeorm');
const dotenv = require('dotenv');

dotenv.config();

const AppDataSource = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST || 'localhost',
    username: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    synchronize: true, // Force sync to see what's failing in the console
    entities: [__dirname + '/dist/**/*.entity.js'],
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: process.env.DB_INSTANCE || undefined,
    },
    port: process.env.DB_INSTANCE ? undefined : parseInt(process.env.DB_PORT || '1433', 10)
});

async function runSync() {
    try {
        console.log('Connecting to database to force TypeORM synchronize...');
        await AppDataSource.initialize();
        console.log('Synchronization completed successfully!');
    } catch (err) {
        console.error('Synchronization failed during connection or schema update:');
        console.error(err.message);
        if (err.query) {
            console.error('Failed Query:', err.query);
        }
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

runSync();
