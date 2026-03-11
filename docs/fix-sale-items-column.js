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

async function fixSaleItemsTotal() {
    let pool;
    try {
        console.log('Veritabanına bağlanılıyor...');
        pool = await sql.connect(config);

        console.log('sale_items tablosuna total kolonu güvenli şekilde ekleniyor (DEFAULT 0)...');
        try {
            await pool.request().query('ALTER TABLE sale_items ADD total decimal(12,2) NOT NULL DEFAULT 0');
            console.log('total kolonu eklendi.');
        } catch (err) {
            console.log('total kolonu halihazırda mevcut veya başka bir hata: ', err.message);
        }

        // Drop the constraint DF_ae77c6e5263ebc843bcc91a98b4 explicitely again just in case
        try {
            await pool.request().query('ALTER TABLE sale_items DROP CONSTRAINT DF_ae77c6e5263ebc843bcc91a98b4');
            console.log('Özel DF_ae77c6e5263ebc843bcc91a98b4 silindi.');
        } catch (e) { }

    } catch (err) {
        console.error('Bağlantı Hatası:', err);
    } finally {
        if (pool) pool.close();
    }
}

fixSaleItemsTotal();
