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

async function fixOrphans() {
    let pool;
    try {
        console.log('Veritabanına bağlanılıyor...');
        pool = await sql.connect(config);

        try {
            console.log('Recipes tablosundaki yetim (ürünü silinmiş) kayıtlar temizleniyor...');
            await pool.request().query(`
                DELETE FROM recipes 
                WHERE productId NOT IN (SELECT id FROM products)
            `);
            console.log('Recipes temizlendi.');
        } catch (e) { console.log(e.message) }

        try {
            console.log('Recipe_items tablosundaki yetim kayıtlar temizleniyor...');
            await pool.request().query(`
                DELETE FROM recipe_items 
                WHERE recipeId NOT IN (SELECT id FROM recipes)
            `);
            console.log('Recipe_items temizlendi.');
        } catch (e) { console.log(e.message) }

        try {
            console.log('Sale_items tablosundaki yetim kayıtlar temizleniyor...');
            await pool.request().query(`
                DELETE FROM sale_items
                WHERE saleId NOT IN (SELECT id FROM sales) OR productId NOT IN (SELECT id FROM products)
            `);
            console.log('Sale_items temizlendi.');
        } catch (e) { console.log(e.message) }

        console.log('Tüm yetim kayıtlar silindi. TypeORM foreign key kısıtlamaları (FK constraints) artık oluşturulabilir.');
    } catch (err) {
        console.error('Bağlantı Hatası:', err);
    } finally {
        if (pool) pool.close();
    }
}

fixOrphans();
