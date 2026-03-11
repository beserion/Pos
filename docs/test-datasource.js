require('dotenv').config();
const { DataSource } = require('typeorm');
const path = require('path');

// Load all entity files
const entities = [path.join(__dirname, 'dist/**/*.entity.js')];

const ds = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '1433'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: false,
    entities: entities,
    options: { encrypt: false, trustServerCertificate: true, connectTimeout: 30000 },
});

console.log('Connecting to:', process.env.DB_HOST, process.env.DB_DATABASE);
ds.initialize()
    .then(() => {
        console.log('✅ DataSource initialized successfully!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ DataSource error:', err.message);
        console.error('Stack:', err.stack);
        process.exit(1);
    });
