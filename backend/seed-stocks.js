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

async function seedStocks() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);

        console.log('Fetching products...');
        const result = await pool.request().query('SELECT id FROM products');
        const products = result.recordset;

        console.log(`Found ${products.length} products. Inserting default stocks...`);
        let inserted = 0;
        for (const p of products) {
            // Check if stock exists for this product
            const check = await pool.request()
                .input('productId', sql.Int, p.id)
                .query('SELECT id FROM stocks WHERE productId = @productId');

            if (check.recordset.length === 0) {
                await pool.request()
                    .input('productId', sql.Int, p.id)
                    .input('quantity', sql.Decimal(10, 2), 50)
                    .input('location', sql.NVarChar, 'Merkez Depo')
                    .query(`
                        INSERT INTO stocks (productId, quantity, location)
                        VALUES (@productId, @quantity, @location)
                    `);
                inserted++;
            }
        }

        console.log(`Successfully added stock records for ${inserted} products.`);
        await pool.close();
    } catch (err) {
        console.error('Error seeding stocks:', err.message);
    }
}

seedStocks();
