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

const uniqueImages = {
    "Filtre Kahve": "https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=600&q=80",
    "Cafe Latte": "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=600&q=80",
    "Cappuccino": "https://images.unsplash.com/photo-1534044199857-7977a4563aab?auto=format&fit=crop&w=600&q=80",
    "Americano": "https://images.unsplash.com/photo-1558564070-5d6664d4b29c?auto=format&fit=crop&w=600&q=80",
    "Espresso (Single)": "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80",
    "Espresso (Double)": "https://images.unsplash.com/photo-1514432324607-a2ce7beeaeff?auto=format&fit=crop&w=600&q=80",
    "Macchiato": "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=600&q=80",
    "Flat White": "https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?auto=format&fit=crop&w=600&q=80",
    "Cortado": "https://images.unsplash.com/photo-1502462041640-b3d17d020e98?auto=format&fit=crop&w=600&q=80",
    "Mocha": "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80",
    "White Chocolate Mocha": "https://images.unsplash.com/photo-1600056781444-55f3b64235e3?auto=format&fit=crop&w=600&q=80",
    "Türk Kahvesi": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80",
    "Fincan Çay": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
    "Kış Çayı": "https://images.unsplash.com/photo-1595981267035-7b04d84b51ad?auto=format&fit=crop&w=600&q=80",
    "Sıcak Çikolata": "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=600&q=80",
    "Ice Latte": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80",
    "Ice Americano": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
    "Iced Mocha": "https://images.unsplash.com/photo-1558227464-3252a1ebd37a?auto=format&fit=crop&w=600&q=80",
    "Iced White Chocolate Mocha": "https://images.unsplash.com/photo-1619864230182-ed1db5ce3535?auto=format&fit=crop&w=600&q=80",
    "Frappe (Karamel)": "https://images.unsplash.com/photo-1579883584824-c1abce5b3e64?auto=format&fit=crop&w=600&q=80",
    "Frappe (Çikolata)": "https://images.unsplash.com/photo-1553177595-4de2bb0842b9?auto=format&fit=crop&w=600&q=80",
    "Limonata (Ev Yapımı)": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    "Churchill": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80",
    "Taze Portakal Suyu": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=600&q=80",
    "Coca Cola (Şişe)": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "Su (Cam Şişe)": "https://images.unsplash.com/photo-1548839140-29a749e1e2d4?auto=format&fit=crop&w=600&q=80",
    "San Sebastian": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80",
    "Tiramisu": "https://images.unsplash.com/photo-1571115177098-24edf646f882?auto=format&fit=crop&w=600&q=80",
    "Brownie (Sıcak)": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
    "Magnolia (Muzlu/Çilekli)": "https://images.unsplash.com/photo-1563805042-7684c8a9e9cb?auto=format&fit=crop&w=600&q=80",
    "Profiterol": "https://images.unsplash.com/photo-1614083584501-8bf79ac222f7?auto=format&fit=crop&w=600&q=80",
    "Sufle": "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&w=600&q=80",
    "Limonlu Cheesecake": "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80",
    "Kulüp Sandviç": "https://images.unsplash.com/photo-1528735602780-2552fd46c7ad?auto=format&fit=crop&w=600&q=80",
    "Margaritha Pizza": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80",
    "Büyük Kahvaltı Tabağı": "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=600&q=80",
    "Pancake Tabağı": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "Tavuklu Sezar Salata": "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=600&q=80",
    "Fettuccine Alfredo": "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=600&q=80",
    "Penne Arrabbiata": "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=600&q=80",
    "Hamburger (Klasik)": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    "Cheeseburger": "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80",
    "Patates Kızartması (Baharatlı)": "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=600&q=80",
    "Soğan Halkası (10'lu)": "https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=600&q=80",
    "Mozzarella Stick": "https://images.unsplash.com/photo-1536511132770-e501ddbaafa2?auto=format&fit=crop&w=600&q=80"
};

async function updateSpecificImages() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);
        let updatedCount = 0;

        for (const [name, url] of Object.entries(uniqueImages)) {
            const res = await pool.request()
                .input('name', sql.NVarChar, name)
                .input('url', sql.NVarChar, url)
                .query(`UPDATE products SET imageUrl = @url WHERE name = @name`);
            updatedCount += res.rowsAffected[0];
        }

        console.log(`Successfully assigned unique images to ${updatedCount} products.`);
        await pool.close();
    } catch (err) {
        console.error(err);
    }
}
updateSpecificImages();
