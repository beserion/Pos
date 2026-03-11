const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35',
    database: 'AntigravityPOS',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const productImages = {
    'Espresso': 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80',
    'Latte': 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=600&q=80',
    'Çay': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    'Cheesecake': 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80',
    'Tiramisu': 'https://images.unsplash.com/photo-1571115177098-24edf646f882?auto=format&fit=crop&w=600&q=80',
    'Su': 'https://images.unsplash.com/photo-1548839140-29a749e1e2d4?auto=format&fit=crop&w=600&q=80',
    'Türk Kahvesi': 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80',
    'Filtre Kahve': 'https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=600&q=80',
    'Tost': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7ad?auto=format&fit=crop&w=600&q=80',
};

// Default image for unknown products
const defaultImage = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80';

async function main() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);

        console.log('Adding imageUrl to products...');
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE Name = N'imageUrl' AND Object_ID = Object_ID(N'products')
            )
            BEGIN
                ALTER TABLE products ADD imageUrl NVARCHAR(MAX) NULL;
                PRINT 'imageUrl added to products.';
            END
        `);

        console.log('Updating images for specific products...');
        for (const [name, url] of Object.entries(productImages)) {
            await pool.request()
                .input('name', sql.NVarChar, name)
                .input('url', sql.NVarChar, url)
                .query(`UPDATE products SET imageUrl = @url WHERE name = @name`);
        }

        console.log('Updating remaining missing product images...');
        await pool.request()
            .input('defaultUrl', sql.NVarChar, defaultImage)
            .query(`UPDATE products SET imageUrl = @defaultUrl WHERE imageUrl IS NULL`);

        console.log('Product images updated successfully.');
        await pool.close();
    } catch (err) {
        console.error('Error updating product images:', err.message);
    }
}

main();
