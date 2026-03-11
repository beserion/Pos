const { DataSource } = require('typeorm');
const path = require('path');

async function debugQuery() {
    const AppDataSource = new DataSource({
        type: 'mssql',
        host: 'localhost',
        port: 1433,
        username: 'sa',
        password: 'YourStrong@Passw0rd',
        database: 'AntigravityPOS',
        entities: [path.join(__dirname, 'dist/**/*.entity.js')],
        synchronize: false,
        options: { encrypt: false, trustServerCertificate: true },
        logging: true,
    });

    try {
        console.log('Connecting...');
        await AppDataSource.initialize();
        console.log('Connected!');

        console.log('Running Order query...');
        const orders = await AppDataSource.manager.find('Order', {
            where: { status: require('typeorm').In(['NEW', 'IN_PREPARATION']) },
            relations: ['items', 'items.product', 'table'],
            order: { createdAt: 'ASC' }
        });

        console.log(`Found ${orders.length} orders`);
    } catch (err) {
        console.error('--- QUERY FAILED ---');
        console.error(err.message);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

debugQuery();
