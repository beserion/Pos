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

const fixes = [
    { id: 7, url: 'https://images.unsplash.com/photo-1594631252845-29fc4586c55c?w=400&q=80' }, // Macchiato
    { id: 20, url: 'https://images.unsplash.com/photo-1461023058943-07fcbebc6d7c?w=400&q=80' }, // Frappe Karamel
    { id: 21, url: 'https://images.unsplash.com/photo-1572490122747-3f14b20d7e22?w=400&q=80' }  // Frappe Çikolata
];

async function run() {
    try {
        await sql.connect(config);
        for (const item of fixes) {
            await sql.query(`UPDATE Products SET imageUrl = '${item.url}' WHERE id = ${item.id}`);
            console.log(`Fixed Product ID ${item.id}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

run();
