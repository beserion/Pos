import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const ds = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '1433'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
});

async function listTypes() {
    try {
        await ds.initialize();
        const types = await ds.query('SELECT * FROM product_types');
        console.log(JSON.stringify(types, null, 2));
        await ds.destroy();
    } catch (err) {
        console.error(err);
    }
}

listTypes();
