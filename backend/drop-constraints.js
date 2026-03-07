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

async function dropAllConstraints() {
    let pool;
    try {
        console.log('Veritabanına bağlanılıyor...');
        pool = await sql.connect(config);

        console.log('Veritabanındaki TÜM varsayılan kısıtlamalar (default constraints) aranıyor...');
        const result = await pool.request().query(`
            SELECT
                t.name AS TableName,
                d.name AS ConstraintName,
                c.name AS ColumnName
            FROM sys.default_constraints d
            INNER JOIN sys.columns c ON d.parent_object_id = c.object_id AND d.parent_column_id = c.column_id
            INNER JOIN sys.tables t ON t.object_id = d.parent_object_id
        `);

        for (const record of result.recordset) {
            const tableName = record.TableName;
            const constraintName = record.ConstraintName;
            const columnName = record.ColumnName;
            console.log(`Tablo: ${tableName} -> Kolon: ${columnName} -> Kısıtlama: ${constraintName}`);

            try {
                await pool.request().query(`ALTER TABLE ${tableName} DROP CONSTRAINT [${constraintName}]`);
                console.log(`[${constraintName}] başarıyla silindi!`);
            } catch (err) {
                console.error(`[${constraintName}] SİLİNEMEDİ:`, err.message);
            }
        }
    } catch (err) {
        console.error('Hata oluştu:', err);
    } finally {
        if (pool) {
            pool.close();
        }
    }
}

dropAllConstraints();
