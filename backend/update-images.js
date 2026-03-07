const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35',
    database: 'AntigravityPOS',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

const updates = [
    { id: 9, url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&q=80' }, // Cortado
    { id: 23, url: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&q=80' }, // Churchill
    { id: 25, url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80' }, // Coca Cola
    { id: 27, url: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=400&q=80' }, // San Sebastian
    { id: 30, url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&q=80' }, // Magnolia
    { id: 31, url: 'https://images.unsplash.com/photo-1511911063855-2bf39afa5b2e?w=400&q=80' }, // Profiterol
    { id: 35, url: 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad38?w=400&q=80' }, // Margaritha Pizza
    { id: 36, url: 'https://images.unsplash.com/photo-1496042399014-dc73c4f2bde1?w=400&q=80' }, // Büyük Kahvaltı
    { id: 37, url: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=400&q=80' }, // Pancake Tabağı
    { id: 38, url: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&q=80' }, // Tavuklu Sezar Salata
    { id: 39, url: 'https://images.unsplash.com/photo-1645112481338-3560e994770c?w=400&q=80' }, // Fettuccine Alfredo
    { id: 40, url: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&q=80' }, // Penne Arrabbiata
    { id: 41, url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80' }, // Hamburger
    { id: 42, url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80' }, // Cheeseburger
    { id: 43, url: 'https://images.unsplash.com/photo-1573016608244-7d5f0e340e6b?w=400&q=80' }, // Patates Kızartması
    { id: 44, url: 'https://images.unsplash.com/photo-1639146502520-7387a1aa6568?w=400&q=80' }, // Soğan Halkası
    { id: 45, url: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=400&q=80' }, // Mozzarella Stick
    { id: 46, url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80' }  // Kahve Çekirdeği
];

async function run() {
    try {
        await sql.connect(config);
        console.log('Connected to database.');

        for (const item of updates) {
            await sql.query(`UPDATE Products SET imageUrl = '${item.url}' WHERE id = ${item.id}`);
            console.log(`Updated Product ID ${item.id}`);
        }

        console.log('All missing images updated successfully.');
    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        await sql.close();
    }
}

run();
