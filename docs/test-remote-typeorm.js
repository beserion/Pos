const { DataSource } = require('typeorm');
require('dotenv').config();
const { ProductTest } = require('../backend/dist/src/products/product.entity');

console.log('ProductTest class source:', ProductTest.toString());

const AppDataSource = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '1433'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: false,
    entities: [ProductTest],
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: process.env.DB_INSTANCE || undefined,
    },
    logging: true
});

console.log('Product prototype keys:', Object.keys(Product.prototype));
console.log('Testing remote TypeORM connection to:', process.env.DB_HOST);

AppDataSource.initialize()
    .then(async () => {
        console.log('✅ Remote DataSource initialized successfully!');
        console.log('Entities loaded:', AppDataSource.entityMetadatas.length);
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Remote DataSource error:', err.message);
        console.error('FULL ERROR JSON:', JSON.stringify({
            message: err.message,
            stack: err.stack,
            code: err.code,
            number: err.number,
            precedingErrors: err.precedingErrors
        }, null, 2));
        process.exit(1);
    });
