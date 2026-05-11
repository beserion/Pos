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

const products = [
    // Yiyecek (ID: 1)
    { name: 'Hamburger', price: 250, productTypeId: 1, imageUrl: '/uploads/products/burger.jpg', sku: 'Y001' },
    { name: 'Pizza Margherita', price: 320, productTypeId: 1, imageUrl: '/uploads/products/image.jpeg', sku: 'Y002' },
    { name: 'Sezar Salata', price: 180, productTypeId: 1, imageUrl: '/uploads/products/salad.jpg', sku: 'Y003' },
    { name: 'Patates Kızartması', price: 120, productTypeId: 1, imageUrl: '/uploads/products/French_Fries.jpg', sku: 'Y004' },
    { name: 'Penne Arrabbiata', price: 210, productTypeId: 1, imageUrl: '/uploads/products/penne.jpg', sku: 'Y005' },
    { name: 'Kulüp Sandviç', price: 195, productTypeId: 1, imageUrl: '/uploads/products/sand.jpg', sku: 'Y006' },
    { name: 'Soğan Halkası', price: 110, productTypeId: 1, imageUrl: '/uploads/products/sogan.jpg', sku: 'Y007' },
    { name: 'Cheeseburger', price: 275, productTypeId: 1, imageUrl: '/uploads/products/chese.jpg', sku: 'Y008' },
    { name: 'Mozzarella Sticks', price: 165, productTypeId: 1, imageUrl: '/uploads/products/mozeral.jpg', sku: 'Y009' },
    { name: 'Günün Çorbası', price: 85, productTypeId: 1, imageUrl: '/uploads/products/kah.jpg', sku: 'Y010' },

    // İçecek (ID: 3)
    { name: 'Coca Cola', price: 65, productTypeId: 3, imageUrl: '/uploads/products/colasise.jpg', sku: 'I001' },
    { name: 'Ev Yapımı Limonata', price: 75, productTypeId: 3, imageUrl: '/uploads/products/limonata.jpg', sku: 'I002' },
    { name: 'Türk Kahvesi', price: 60, productTypeId: 3, imageUrl: '/uploads/products/servet-turk-kahvesi-01.webp', sku: 'I003' },
    { name: 'Su 0.5L', price: 25, productTypeId: 3, imageUrl: '/uploads/products/sucam.jpg', sku: 'I004' },
    { name: 'Americano', price: 85, productTypeId: 3, imageUrl: '/uploads/products/americano.jpg', sku: 'I005' },
    { name: 'Iced Latte', price: 95, productTypeId: 3, imageUrl: '/uploads/products/icelatte.webp', sku: 'I006' },
    { name: 'Caffè Mocha', price: 105, productTypeId: 3, imageUrl: '/uploads/products/mocha.png', sku: 'I007' },
    { name: 'Espresso', price: 55, productTypeId: 3, imageUrl: '/uploads/products/espresso_480x480.webp', sku: 'I008' },
    { name: 'Churchill', price: 45, productTypeId: 3, imageUrl: '/uploads/products/churchill.jpg', sku: 'I009' },
    { name: 'Taze Portakal Suyu', price: 90, productTypeId: 3, imageUrl: '/uploads/products/portakal.jpg', sku: 'I010' },

    // Tatlı (ID: 4)
    { name: 'Çikolatalı Brownie', price: 145, productTypeId: 4, imageUrl: '/uploads/products/brownie.jpg', sku: 'T001' },
    { name: 'Tiramisu', price: 160, productTypeId: 4, imageUrl: '/uploads/products/tiramisu.jpg', sku: 'T002' },
    { name: 'Akışkan Sufle', price: 155, productTypeId: 4, imageUrl: '/uploads/products/sufle.jpg', sku: 'T003' },
    { name: 'Çilekli Magnolia', price: 135, productTypeId: 4, imageUrl: '/uploads/products/mag.jpg', sku: 'T004' },
    { name: 'Profiterol', price: 140, productTypeId: 4, imageUrl: '/uploads/products/prof.jpg', sku: 'T005' },
    { name: 'Karamelli Frappe', price: 115, productTypeId: 4, imageUrl: '/uploads/products/karamelli-frappe-nasil-yapilir-2.webp', sku: 'T006' },
    { name: 'Çikolatalı Pasta', price: 150, productTypeId: 4, imageUrl: '/uploads/products/ciko.jpg', sku: 'T007' },
    { name: 'San Sebastian Cheesecake', price: 175, productTypeId: 4, imageUrl: '/uploads/products/san.jpg', sku: 'T008' },
    { name: 'White Chocolate Mocha Cake', price: 145, productTypeId: 4, imageUrl: '/uploads/products/whcm.jpg', sku: 'T009' },
    { name: 'Meyveli Kup', price: 130, productTypeId: 4, imageUrl: '/uploads/products/summer.jpg', sku: 'T010' },

    // Diğer (ID: 5)
    { name: 'Fincan Çay', price: 35, productTypeId: 5, imageUrl: '/uploads/products/184-fincan-cay.jpg', sku: 'D001' },
    { name: 'Filtre Kahve', price: 75, productTypeId: 5, imageUrl: '/uploads/products/en-yumusak-icimli-filtre-kahve.jpg', sku: 'D002' },
    { name: 'Bitki Çayı', price: 55, productTypeId: 5, imageUrl: '/uploads/products/kis.jpg', sku: 'D003' },
    { name: 'Votka Enerji', price: 350, productTypeId: 5, imageUrl: '/uploads/products/votka.jpg', sku: 'D004' },
    { name: 'Classic Margarita', price: 380, productTypeId: 5, imageUrl: '/uploads/products/marg.jpg', sku: 'D005' },
    { name: 'Ev Kurabiyesi', price: 45, productTypeId: 5, imageUrl: '/uploads/products/1.webp', sku: 'D006' },
    { name: 'Atıştırmalık Tabağı', price: 190, productTypeId: 5, imageUrl: '/uploads/products/alf.jpg', sku: 'D007' },
    { name: 'Naneli Ferahlık', price: 80, productTypeId: 5, imageUrl: '/uploads/products/lemon.jpg', sku: 'D008' },
    { name: 'Tire Şiş Köfte', price: 290, productTypeId: 5, imageUrl: '/uploads/products/tire.jpg', sku: 'D009' },
    { name: 'Günün Spesiyali', price: 310, productTypeId: 5, imageUrl: '/uploads/products/yeni.jpg', sku: 'D010' },
];

async function seed() {
    try {
        console.log('Connecting to database...');
        await ds.initialize();
        console.log('Connected!');

        console.log(`Inserting ${products.length} products...`);

        for (const p of products) {
            // Check if SKU exists
            const existing = await ds.query('SELECT id FROM products WHERE sku = @0', [p.sku]);
            if (existing.length > 0) {
                console.log(`Skipping ${p.name} (SKU ${p.sku} already exists)`);
                continue;
            }

            await ds.query(
                `INSERT INTO products (name, sku, price, vatRate, isActive, orderIndex, openPriceEnabled, discountAllowed, compAllowed, imageUrl, posVisible, takeawayVisible, deliveryVisible, qrVisible, kioskVisible, inventoryLinkType, productTypeId, unit, isQuickSale, isIngredient, isSet, createdAt, updatedAt) 
                 VALUES (@0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10, @11, @12, @13, @14, @15, @16, @17, @18, @19, @20, GETDATE(), GETDATE())`,
                [
                    p.name, p.sku, p.price, 10, 1, 0, 0, 1, 1, p.imageUrl, 1, 1, 1, 1, 1, 'none', p.productTypeId, 'adet', 1, 0, 0
                ]
            );
            console.log(`Inserted: ${p.name}`);
        }

        console.log('Seed completed successfully!');
        await ds.destroy();
        process.exit(0);
    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
}

seed();
