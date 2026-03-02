const { createConnection } = require('typeorm');

async function testConnection() {
    try {
        console.log('Testing TypeORM connection...');
        const connection = await createConnection({
            type: 'mssql',
            host: 'localhost',
            port: 1433,
            username: 'sa',
            password: 'YourStrong@Passw0rd',
            database: 'AntigravityPOS',
            options: {
                encrypt: false,
                trustServerCertificate: true,
            },
            entities: [
                // Minimal check
            ],
            synchronize: true,
        });
        console.log('Connection successful!');
        await connection.close();
    } catch (error) {
        console.error('Connection failed:', error.message);
    }
}

testConnection();
