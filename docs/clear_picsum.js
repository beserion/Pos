const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35',
    database: 'AntigravityPOS',
    options: { encrypt: false, trustServerCertificate: true }
};

async function run() {
    try {
        const pool = await sql.connect(config);

        // Remove ALL random placeholders we recently added
        const res = await pool.query(`UPDATE products SET imageUrl = NULL WHERE CAST(imageUrl AS NVARCHAR(MAX)) LIKE '%picsum.photos%'`);
        console.log(`Cleared ${res.rowsAffected[0]} random picsum images.`);

        // Now if we have update-product-images.js, maybe there was a default image?
        // Let's just restore the unique images to be absolutely sure.

        await pool.close();
    } catch (e) {
        console.error(e);
    }
}
run();
