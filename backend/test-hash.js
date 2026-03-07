const { DataSource } = require('typeorm');
const path = require('path');
const bcrypt = require('bcrypt');

async function testPassword() {
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
        const user = await AppDataSource.manager.findOne('User', { where: { email: 'admin@antigravity.com' } });
        if (!user) {
            console.log("Admin user not found.");
            return;
        }

        console.log(`User: ${user.email}`);
        console.log(`passwordHash: ${user.passwordHash}`);
        console.log(`passwordClearText: ${user.passwordClearText}`);

        const isMatch = await bcrypt.compare('123456', user.passwordHash);
        console.log(`Does '123456' match passwordHash? ${isMatch}`);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
    }
}

testPassword();
