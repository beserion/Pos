const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const config = {
    server: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: process.env.DB_INSTANCE || undefined
    },
    port: process.env.DB_INSTANCE ? undefined : parseInt(process.env.DB_PORT || '1433', 10)
};

async function dropAllFKConstraints() {
    let pool;
    try {
        console.log('Veritabanına bağlanılıyor...');
        pool = await sql.connect(config);

        console.log('Tüm tablolardaki FOREIGN KEY kısıtlamaları aranıyor...');
        const result = await pool.request().query(`
            SELECT
                t.name AS TableName,
                fk.name AS ConstraintName
            FROM sys.foreign_keys AS fk
            INNER JOIN sys.tables AS t ON fk.parent_object_id = t.object_id
        `);

        console.log(`${result.recordset.length} adet FK kısıtlaması bulundu.`);

        for (const record of result.recordset) {
            const tableName = record.TableName;
            const constraintName = record.ConstraintName;
            try {
                await pool.request().query(`ALTER TABLE ${tableName} DROP CONSTRAINT [${constraintName}]`);
                console.log(`[${tableName}.${constraintName}] silindi.`);
            } catch (err) {
                console.error(`[${tableName}.${constraintName}] SİLİNEMEDİ:`, err.message);
            }
        }

        console.log('Tüm FK kısıtlamaları silindi. TypeORM artık yeniden oluşturabilecek.');
    } catch (err) {
        console.error('Bağlantı Hatası:', err);
    } finally {
        if (pool) pool.close();
    }
}

dropAllFKConstraints();
