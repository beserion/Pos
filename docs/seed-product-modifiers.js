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

async function seedProductModifiers() {
    try {
        console.log('Connecting to database...');
        let pool = await sql.connect(config);
        console.log('Connected to MSSQL Database!');

        const productsRes = await pool.request().query('SELECT id, name, category FROM products');
        const modifiersRes = await pool.request().query('SELECT id, name, groupName FROM modifiers');

        const products = productsRes.recordset;
        const modifiers = modifiersRes.recordset;

        if (products.length === 0 || modifiers.length === 0) {
            console.log('No products or modifiers found.');
            return;
        }

        console.log(`Found ${products.length} products and ${modifiers.length} modifiers.`);

        let linkCount = 0;

        // Clear existing product modifiers
        await pool.request().query('TRUNCATE TABLE product_modifiers');

        for (const product of products) {
            // Pick modifiers based on category or just randomly pick 15-20 diverse modifiers for demonstration
            // To make it look "bol çeşitli" (plentiful) as user requested
            let selectedMods = [];
            const cat = (product.category || '').toLowerCase();

            if (cat.includes('içecek') || cat.includes('kahve') || cat.includes('çay') || cat.includes('meşrubat')) {
                // Drinks
                selectedMods = modifiers.filter(m =>
                    (m.groupName && m.groupName.includes('İçecekler')) ||
                    m.name.includes('Buz') ||
                    m.name.includes('Sıcak') ||
                    m.name.includes('Süt') ||
                    m.name.includes('Şeker')
                );
            } else if (cat.includes('yiyecek') || cat.includes('burger') || cat.includes('pizza') || cat.includes('atıştırmalık') || cat.includes('ana yemek')) {
                // Food
                selectedMods = modifiers.filter(m =>
                (m.groupName && (
                    m.groupName.includes('Et') ||
                    m.groupName.includes('Soslar') ||
                    m.groupName.includes('Peynirler') ||
                    m.groupName.includes('Ekmek')
                ))
                );
            } else {
                // Default fallback: give them a mix of everything
                selectedMods = modifiers.filter(m => Math.random() > 0.6); // About 40% of all modifiers
            }

            // Cap at 25 modifiers max to avoid clutter if too many
            if (selectedMods.length > 25) {
                selectedMods = selectedMods.slice(0, 25);
            }

            for (const mod of selectedMods) {
                await pool.request()
                    .input('productId', sql.Int, product.id)
                    .input('modifierId', sql.Int, mod.id)
                    .query('INSERT INTO product_modifiers (productsId, modifiersId) VALUES (@productId, @modifierId)');
                linkCount++;
            }
        }

        console.log(`\nSuccessfully linked ${linkCount} modifiers across ${products.length} products!`);
        await pool.close();
    } catch (err) {
        console.error('Error seeding database:', err);
    }
}

seedProductModifiers();
