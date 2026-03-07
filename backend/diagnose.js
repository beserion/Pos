const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const config = {
    server: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    options: { encrypt: false, trustServerCertificate: true, instanceName: process.env.DB_INSTANCE || undefined },
    port: process.env.DB_INSTANCE ? undefined : parseInt(process.env.DB_PORT || '1433', 10)
};

async function investigate() {
    let pool;
    try {
        pool = await sql.connect(config);

        const recipeCount = await pool.request().query('SELECT COUNT(*) cnt FROM recipes');
        console.log('Recipes satır sayısı:', recipeCount.recordset[0].cnt);

        const productIds = await pool.request().query('SELECT id FROM products');
        console.log('Ürün ID listesi:', productIds.recordset.map(p => p.id).join(', '));

        const badProductId = await pool.request().query(`
            SELECT id, productId, ingredientId FROM recipes
            WHERE productId NOT IN (SELECT id FROM products)
               OR ingredientId NOT IN (SELECT id FROM products)
        `);
        console.log('Yetim recipes (productId veya ingredientId geçersiz):', JSON.stringify(badProductId.recordset));

        // Also check if there's already a FK constraint on recipes
        const fks = await pool.request().query(`
            SELECT fk.name FROM sys.foreign_keys fk
            INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id
            WHERE t.name = 'recipes'
        `);
        console.log('Recipes tablosundaki mevcut FK constraints:', fks.recordset.map(r => r.name).join(', ') || 'Hiç yok');

    } catch (err) {
        console.error('Hata:', err.message);
    } finally {
        if (pool) pool.close();
    }
}

investigate();
