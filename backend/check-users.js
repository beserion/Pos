const { DataSource } = require('typeorm');
const path = require('path');

async function checkUsers() {
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
        logging: false,
    });

    try {
        await AppDataSource.initialize();
        const users = await AppDataSource.manager.find('User');
        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- ${u.email} (Active: ${u.isActive})`);
        });
    } catch (err) {
        console.error('Failed to get users:', err.message);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
    }
}

checkUsers();
