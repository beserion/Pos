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

const extraProducts = [
    // Yiyecek (Type 1) - 20 more (11-30)
    { name: 'Double Burger', price: 320, productTypeId: 1, imageUrl: '/uploads/products/burger.jpg', sku: 'Y011' },
    { name: 'Karışık Pizza', price: 350, productTypeId: 1, imageUrl: '/uploads/products/image.jpeg', sku: 'Y012' },
    { name: 'Tavuklu Sezar Salata', price: 210, productTypeId: 1, imageUrl: '/uploads/products/salad.jpg', sku: 'Y013' },
    { name: 'Baharatlı Patates Kızartması', price: 135, productTypeId: 1, imageUrl: '/uploads/products/French_Fries.jpg', sku: 'Y014' },
    { name: 'Mantarlı Kremalı Makarna', price: 225, productTypeId: 1, imageUrl: '/uploads/products/penne.jpg', sku: 'Y015' },
    { name: 'Ton Balıklı Sandviç', price: 185, productTypeId: 1, imageUrl: '/uploads/products/sand.jpg', sku: 'Y016' },
    { name: 'Çıtır Soğan Halkası XL', price: 140, productTypeId: 1, imageUrl: '/uploads/products/sogan.jpg', sku: 'Y017' },
    { name: 'Bacon Burger', price: 340, productTypeId: 1, imageUrl: '/uploads/products/chese.jpg', sku: 'Y018' },
    { name: 'Çıtır Peynir Çubukları', price: 175, productTypeId: 1, imageUrl: '/uploads/products/mozeral.jpg', sku: 'Y019' },
    { name: 'Süzme Mercimek Çorbası', price: 95, productTypeId: 1, imageUrl: '/uploads/products/kah.jpg', sku: 'Y020' },
    { name: 'Izgara Köfte Tabağı', price: 280, productTypeId: 1, imageUrl: '/uploads/products/tire.jpg', sku: 'Y021' },
    { name: 'Izgara Tavuk Göğsü', price: 240, productTypeId: 1, imageUrl: '/uploads/products/alf.jpg', sku: 'Y022' },
    { name: 'Tavuk Schnitzel', price: 265, productTypeId: 1, imageUrl: '/uploads/products/yeni.jpg', sku: 'Y023' },
    { name: 'Bolonez Soslu Lazanya', price: 290, productTypeId: 1, imageUrl: '/uploads/products/image.jpeg', sku: 'Y024' },
    { name: 'Etli Dürüm Wrap', price: 230, productTypeId: 1, imageUrl: '/uploads/products/sand.jpg', sku: 'Y025' },
    { name: 'Falafel Tabağı', price: 195, productTypeId: 1, imageUrl: '/uploads/products/salad.jpg', sku: 'Y026' },
    { name: 'Hot Dog Klasik', price: 155, productTypeId: 1, imageUrl: '/uploads/products/burger.jpg', sku: 'Y027' },
    { name: 'Fish and Chips', price: 310, productTypeId: 1, imageUrl: '/uploads/products/French_Fries.jpg', sku: 'Y028' },
    { name: 'Ispanaklı Ravioli', price: 245, productTypeId: 1, imageUrl: '/uploads/products/penne.jpg', sku: 'Y029' },
    { name: 'Spaghetti Carbonara', price: 235, productTypeId: 1, imageUrl: '/uploads/products/penne.jpg', sku: 'Y030' },

    // İçecek (Type 3) - 20 more (11-30)
    { name: 'Pepsi Max', price: 65, productTypeId: 3, imageUrl: '/uploads/products/colasise.jpg', sku: 'I011' },
    { name: 'Çilekli Limonata', price: 85, productTypeId: 3, imageUrl: '/uploads/products/limonata.jpg', sku: 'I012' },
    { name: 'Dibek Kahvesi', price: 70, productTypeId: 3, imageUrl: '/uploads/products/servet-turk-kahvesi-01.webp', sku: 'I013' },
    { name: 'Maden Suyu', price: 35, productTypeId: 3, imageUrl: '/uploads/products/sucam.jpg', sku: 'I014' },
    { name: 'Flat White', price: 90, productTypeId: 3, imageUrl: '/uploads/products/americano.jpg', sku: 'I015' },
    { name: 'Caramel Latte', price: 105, productTypeId: 3, imageUrl: '/uploads/products/icelatte.webp', sku: 'I016' },
    { name: 'White Mocha', price: 110, productTypeId: 3, imageUrl: '/uploads/products/mocha.png', sku: 'I017' },
    { name: 'Double Espresso', price: 75, productTypeId: 3, imageUrl: '/uploads/products/espresso_480x480.webp', sku: 'I018' },
    { name: 'Nane Limon Churchill', price: 55, productTypeId: 3, imageUrl: '/uploads/products/churchill.jpg', sku: 'I019' },
    { name: 'Taze Elma Suyu', price: 85, productTypeId: 3, imageUrl: '/uploads/products/portakal.jpg', sku: 'I020' },
    { name: 'Ice Tea Şeftali', price: 65, productTypeId: 3, imageUrl: '/uploads/products/colasise.jpg', sku: 'I021' },
    { name: 'Ice Tea Limon', price: 65, productTypeId: 3, imageUrl: '/uploads/products/colasise.jpg', sku: 'I022' },
    { name: 'Naneli Ayran', price: 45, productTypeId: 3, imageUrl: '/uploads/products/sucam.jpg', sku: 'I023' },
    { name: 'Sütlü Salep', price: 95, productTypeId: 3, imageUrl: '/uploads/products/coffee.png', sku: 'I024' },
    { name: 'Sıcak Çikolata XL', price: 105, productTypeId: 3, imageUrl: '/uploads/products/coffee.png', sku: 'I025' },
    { name: 'Cortado Special', price: 85, productTypeId: 3, imageUrl: '/uploads/products/cortado.webp', sku: 'I026' },
    { name: 'Latte Macchiato', price: 100, productTypeId: 3, imageUrl: '/uploads/products/macchiato-nedir-nasil-yapilir-icilir.webp', sku: 'I027' },
    { name: 'Çikolatalı Frappuccino', price: 125, productTypeId: 3, imageUrl: '/uploads/products/frapciko.jpg', sku: 'I028' },
    { name: 'Cold Brew Coffee', price: 95, productTypeId: 3, imageUrl: '/uploads/products/iceameri.jpg', sku: 'I029' },
    { name: 'Filtre Kahve (Kenya)', price: 85, productTypeId: 3, imageUrl: '/uploads/products/en-yumusak-icimli-filtre-kahve.jpg', sku: 'I030' },

    // Tatlı (Type 4) - 20 more (11-30)
    { name: 'Double Çikolatalı Brownie', price: 165, productTypeId: 4, imageUrl: '/uploads/products/brownie.jpg', sku: 'T011' },
    { name: 'Lotuslu Tiramisu', price: 185, productTypeId: 4, imageUrl: '/uploads/products/tiramisu.jpg', sku: 'T012' },
    { name: 'Dondurmalı Sıcak Sufle', price: 175, productTypeId: 4, imageUrl: '/uploads/products/sufle.jpg', sku: 'T013' },
    { name: 'Muzlu Magnolia', price: 145, productTypeId: 4, imageUrl: '/uploads/products/mag.jpg', sku: 'T014' },
    { name: 'Antep Fıstıklı Profiterol', price: 160, productTypeId: 4, imageUrl: '/uploads/products/prof.jpg', sku: 'T015' },
    { name: 'Vanilyalı Frappe', price: 115, productTypeId: 4, imageUrl: '/uploads/products/karamelli-frappe-nasil-yapilir-2.webp', sku: 'T016' },
    { name: 'Frambuazlı Yaş Pasta', price: 165, productTypeId: 4, imageUrl: '/uploads/products/ciko.jpg', sku: 'T017' },
    { name: 'Karamel Soslu San Sebastian', price: 195, productTypeId: 4, imageUrl: '/uploads/products/san.jpg', sku: 'T018' },
    { name: 'Orman Meyveli Pasta', price: 160, productTypeId: 4, imageUrl: '/uploads/products/whcm.jpg', sku: 'T019' },
    { name: 'Limonlu Sorbe', price: 110, productTypeId: 4, imageUrl: '/uploads/products/summer.jpg', sku: 'T020' },
    { name: 'Antep Fıstıklı Baklava', price: 210, productTypeId: 4, imageUrl: '/uploads/products/tiramisu.jpg', sku: 'T021' },
    { name: 'Fırın Sütlaç', price: 120, productTypeId: 4, imageUrl: '/uploads/products/mag.jpg', sku: 'T022' },
    { name: 'Damla Sakızlı Kazandibi', price: 115, productTypeId: 4, imageUrl: '/uploads/products/mag.jpg', sku: 'T023' },
    { name: 'Peynirli Künefe', price: 180, productTypeId: 4, imageUrl: '/uploads/products/tiramisu.jpg', sku: 'T024' },
    { name: 'Bisküvili Mozaik Pasta', price: 130, productTypeId: 4, imageUrl: '/uploads/products/ciko.jpg', sku: 'T025' },
    { name: 'Cheesecake Frambuaz', price: 170, productTypeId: 4, imageUrl: '/uploads/products/san.jpg', sku: 'T026' },
    { name: 'Cheesecake Limon', price: 170, productTypeId: 4, imageUrl: '/uploads/products/san.jpg', sku: 'T027' },
    { name: 'Çikolatalı Ekler', price: 140, productTypeId: 4, imageUrl: '/uploads/products/prof.jpg', sku: 'T028' },
    { name: 'Karamelli Trileçe', price: 145, productTypeId: 4, imageUrl: '/uploads/products/mag.jpg', sku: 'T029' },
    { name: 'Karışık Meyve Tabağı', price: 190, productTypeId: 4, imageUrl: '/uploads/products/summer.jpg', sku: 'T030' },

    // Diğer (Type 5) - 20 more (11-30)
    { name: 'Kupa Çay', price: 50, productTypeId: 5, imageUrl: '/uploads/products/184-fincan-cay.jpg', sku: 'D011' },
    { name: 'Kenya Single Origin', price: 95, productTypeId: 5, imageUrl: '/uploads/products/en-yumusak-icimli-filtre-kahve.jpg', sku: 'D012' },
    { name: 'Taze Ihlamur Çayı', price: 65, productTypeId: 5, imageUrl: '/uploads/products/kis.jpg', sku: 'D013' },
    { name: 'Votka Vişne', price: 370, productTypeId: 5, imageUrl: '/uploads/products/votka.jpg', sku: 'D014' },
    { name: 'Blue Lagoon Cocktail', price: 395, productTypeId: 5, imageUrl: '/uploads/products/marg.jpg', sku: 'D015' },
    { name: 'Yulaflı Diyet Kurabiye', price: 55, productTypeId: 5, imageUrl: '/uploads/products/1.webp', sku: 'D016' },
    { name: 'Sıcak Bira Tabağı', price: 220, productTypeId: 5, imageUrl: '/uploads/products/alf.jpg', sku: 'D017' },
    { name: 'Sprite 330ml', price: 65, productTypeId: 5, imageUrl: '/uploads/products/colasise.jpg', sku: 'D018' },
    { name: 'Tekila Shot Silver', price: 150, productTypeId: 5, imageUrl: '/uploads/products/votka.jpg', sku: 'D019' },
    { name: 'Cin Tonik London', price: 340, productTypeId: 5, imageUrl: '/uploads/products/votka.jpg', sku: 'D020' },
    { name: 'Yeni Rakı 35cl', price: 850, productTypeId: 5, imageUrl: '/uploads/products/sucam.jpg', sku: 'D021' },
    { name: 'Kırmızı Şarap (Kadeh)', price: 210, productTypeId: 5, imageUrl: '/uploads/products/marg.jpg', sku: 'D022' },
    { name: 'Viski (Double)', price: 450, productTypeId: 5, imageUrl: '/uploads/products/votka.jpg', sku: 'D023' },
    { name: 'Serpme Kahvaltı Menüsü', price: 450, productTypeId: 5, imageUrl: '/uploads/products/kah.jpg', sku: 'D024' },
    { name: 'Hafta Sonu Brunch', price: 550, productTypeId: 5, imageUrl: '/uploads/products/kah.jpg', sku: 'D025' },
    { name: 'Aperol Spritz Special', price: 380, productTypeId: 5, imageUrl: '/uploads/products/summer.jpg', sku: 'D026' },
    { name: 'Nane & Lime Mojito', price: 360, productTypeId: 5, imageUrl: '/uploads/products/lemon.jpg', sku: 'D027' },
    { name: 'Espresso Martini', price: 340, productTypeId: 5, imageUrl: '/uploads/products/mocha.png', sku: 'D028' },
    { name: 'Classic Cosmopolitan', price: 370, productTypeId: 5, imageUrl: '/uploads/products/marg.jpg', sku: 'D029' },
    { name: 'Spicy Bloody Mary', price: 390, productTypeId: 5, imageUrl: '/uploads/products/colasise.jpg', sku: 'D030' },
];

async function seed() {
    try {
        console.log('Connecting to database...');
        await ds.initialize();
        console.log('Connected!');

        console.log(`Inserting ${extraProducts.length} extra products...`);

        for (const p of extraProducts) {
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

        console.log('Extra seed completed successfully!');
        await ds.destroy();
        process.exit(0);
    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
}

seed();
