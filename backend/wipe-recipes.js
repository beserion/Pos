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

async function wipeRecipes() {
    let pool;
    try {
        console.log('Veritabanına bağlanılıyor...');
        pool = await sql.connect(config);

        console.log('Test verilerinden kalan bozuk FOREIGN KEY bağımlılıklarını silmek için Recipe tabloları sıfırlanıyor...');
        try {
            await pool.request().query(`DELETE FROM recipe_items`);
            console.log('Recipe_items başarıyla temizlendi.');

            await pool.request().query(`DELETE FROM recipes`);
            console.log('Recipes başarıyla temizlendi.');
        } catch (e) {
            console.log('Tablolar temizlenirken ufak bir sorun oluştu (zaten boş olabilir): ', e.message);
        }

        console.log('Tüm veriler temizlendi.');
    } catch (err) {
        console.error('Bağlantı Hatası:', err);
    } finally {
        if (pool) pool.close();
    }
}

wipeRecipes();
