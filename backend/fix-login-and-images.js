const sql = require('mssql');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
dotenv.config();

const config = {
    server: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    options: { encrypt: false, trustServerCertificate: true }
};

const PRODUCTS_WITH_IMAGES = [
    { name: 'Espresso', imageUrl: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&q=80' },
    { name: 'Americano', imageUrl: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=400&q=80' },
    { name: 'Cappuccino', imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&q=80' },
    { name: 'Latte', imageUrl: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=400&q=80' },
    { name: 'Flat White', imageUrl: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400&q=80' },
    { name: 'Macchiato', imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510bd9d4?w=400&q=80' },
    { name: 'Mocha', imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&q=80' },
    { name: 'Türk Kahvesi', imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80' },
    { name: 'Filtre Kahve', imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80' },
    { name: 'Sıcak Çikolata', imageUrl: 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=400&q=80' },
    { name: 'Salep', imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&q=80' },
    { name: 'Çay', imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80' },
    { name: 'Bitki Çayı', imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80' },
    { name: 'Matcha Latte', imageUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400&q=80' },
    { name: 'Soğuk Kahve', imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80' },
    { name: 'Cold Brew', imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80' },
    { name: 'Frappe', imageUrl: 'https://images.unsplash.com/photo-1572490122747-3f14b20d7e22?w=400&q=80' },
    { name: 'Milkshake', imageUrl: 'https://images.unsplash.com/photo-1572490122747-3f14b20d7e22?w=400&q=80' },
    { name: 'Meyve Suyu', imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&q=80' },
    { name: 'Limonata', imageUrl: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&q=80' },
    { name: 'Su', imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80' },
    { name: 'Soda', imageUrl: 'https://images.unsplash.com/photo-1437620692895-bf6de5f9e2b3?w=400&q=80' },
    { name: 'Ayran', imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&q=80' },
    { name: 'Cheesecake', imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&q=80' },
    { name: 'Tiramisu', imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80' },
    { name: 'Brownie', imageUrl: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400&q=80' },
    { name: 'Waffle', imageUrl: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400&q=80' },
    { name: 'Krep', imageUrl: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400&q=80' },
    { name: 'Muffin', imageUrl: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&q=80' },
    { name: 'Kurabiye', imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80' },
    { name: 'Croissant', imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80' },
    { name: 'Sandviç', imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80' },
    { name: 'Tost', imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80' },
    { name: 'Pasta', imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80' },
    { name: 'Baklava', imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80' },
];

async function main() {
    const pool = await sql.connect(config);

    // 1. Check users table columns
    const cols = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users'");
    console.log('Users columns:', cols.recordset.map(c => c.COLUMN_NAME).join(', '));

    // 2. Reset admin password
    const newHash = await bcrypt.hash('admin123', 10);

    const users = await pool.request().query('SELECT TOP 5 id, email FROM users');
    console.log('Users:', JSON.stringify(users.recordset));

    if (users.recordset.length > 0) {
        const adminUser = users.recordset[0];
        await pool.request().query(`UPDATE users SET passwordHash='${newHash}' WHERE id=${adminUser.id}`);
        console.log(`Admin şifresi sıfırlandı: ${adminUser.email} -> admin123`);
    }

    // 3. Reload product images
    const products = await pool.request().query('SELECT id, name FROM products WHERE imageUrl IS NULL OR imageUrl = \'\'');
    console.log(`Görselsiz ürün sayısı: ${products.recordset.length}`);

    let updated = 0;
    for (const product of products.recordset) {
        const match = PRODUCTS_WITH_IMAGES.find(p =>
            product.name.toLowerCase().includes(p.name.toLowerCase()) ||
            p.name.toLowerCase().includes(product.name.toLowerCase())
        );
        if (match) {
            await pool.request().query(`UPDATE products SET imageUrl='${match.imageUrl}' WHERE id=${product.id}`);
            console.log(`Güncellendi: ${product.name} -> ${match.imageUrl.substring(0, 50)}...`);
            updated++;
        }
    }

    // Also update all products with matching names even if they have images
    const allProducts = await pool.request().query('SELECT id, name FROM products');
    for (const product of allProducts.recordset) {
        const match = PRODUCTS_WITH_IMAGES.find(p =>
            product.name.toLowerCase().includes(p.name.toLowerCase()) ||
            p.name.toLowerCase().includes(product.name.toLowerCase())
        );
        if (match) {
            await pool.request().query(`UPDATE products SET imageUrl='${match.imageUrl}' WHERE id=${product.id}`);
        }
    }

    console.log(`\nToplam ${updated} ürün görseli güncellendi.`);
    pool.close();
}

main().catch(e => console.error(e.message));
