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

async function fixAll() {
    let pool;
    try {
        console.log('Veritabanına bağlanılıyor...');
        pool = await sql.connect(config);

        // Recipes - orphaned productId values
        try {
            const orphaned = await pool.request().query(`
                SELECT COUNT(*) AS cnt FROM recipes 
                WHERE productId NOT IN (SELECT id FROM products)
                   OR ingredientId NOT IN (SELECT id FROM products)
            `);
            console.log(`Yetim recipe kayıtları: ${orphaned.recordset[0].cnt}`);

            await pool.request().query(`
                DELETE FROM recipes 
                WHERE productId NOT IN (SELECT id FROM products)
                   OR ingredientId NOT IN (SELECT id FROM products)
            `);
            console.log('Recipes temizlendi (ürün referansı olmayan kayıtlar silindi).');
        } catch (e) {
            console.log('Recipes temizleme hatası: ', e.message);
        }

        console.log('Tümü temizlendi. Şimdi force-sync.js çalıştırın.');
    } catch (err) {
        console.error('Bağlantı Hatası:', err);
    } finally {
        if (pool) pool.close();
    }
}

fixAll();
