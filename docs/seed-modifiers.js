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

const modifiers = [
    // Et ve Pişirme (Meat & Cooking)
    'Az Pişmiş', 'Orta Pişmiş', 'İyi Pişmiş', 'Çok Pişmiş', 'Az Yağlı', 'Bol Yağlı',

    // Soslar & İçerikler (Sauces & Ingredients)
    'Ketçaplı', 'Ketçapsız', 'Mayonezli', 'Mayonezsiz', 'Hardallı', 'Hardalsız',
    'Acı Soslu', 'Sarımsaklı Mayonezli', 'Ranch Soslu', 'Barbekü Soslu', 'Ballı Hardallı',
    'Soğanlı', 'Soğansız', 'Karameleze Soğanlı',
    'Turşulu', 'Turşusuz', 'Domatesli', 'Domatessiz', 'Marullu', 'Marulsuz',
    'Jalapeno Biberli', 'Meksika Fasulyeli', 'Zeytinli', 'Mantarlı', 'Mısırlı',
    'Baharatlı', 'Baharat Değmesin', 'Tuzsuz', 'Az Tuzlu', 'Bol Tuzlu',

    // Peynirler (Cheeses)
    'Ekstra Peynirli', 'Kaşarlı', 'Kaşarsız', 'Cheddar Peynirli', 'Tulum Peynirli',
    'Beyaz Peynirli', 'Ezine Peynirli',

    // Ekmek/Karbonhidrat (Breads/Carbs)
    'Kepekli Ekmeğe', 'Tam Buğday Ekmeğine', 'Glutensiz Ekmek', 'Lavaş Arası', 'Ekmeksiz',
    'Esmer Tortilla',

    // Boyutlar (Sizes/Portions)
    'Küçük Porsiyon', 'Büyük Porsiyon', 'Çocuk Boy', 'Diyet Porsiyon', 'Ekstra Porsiyon',

    // İçecekler: Isı & Buz (Drinks: Temp & Ice)
    'Sıcak', 'Ilık', 'Ekstra Sıcak', 'Buzlu', 'Buzsuz', 'Az Buzlu', 'Bol Buzlu', 'Frappe (Kırık Buz)',

    // İçecekler: Kahve ve Süt Tercihleri (Drinks: Coffee & Milk)
    'Sütlü', 'Sütsüz', 'Az Sütlü', 'Bol Sütlü', 'Soya Sütlü', 'Badem Sütlü', 'Yulaf Sütlü', 'Hindistan Cevizi Sütlü', 'Laktozsuz Sütlü',
    'Kremalı', 'Kremasız', 'Ekstra Sentetik Krema', 'Az Kremalı',
    'Ekstra Shot Espresso', 'Yarım Shot Espresso',

    // İçecekler: Tatlandırıcı & Şurup (Drinks: Sweets & Syrups)
    'Şekerli', 'Şekersiz', 'Az Şekerli', 'Orta Şekerli', 'Esmer Şekerli', 'Tatlandırıcılı',
    'Karamel Şuruplu', 'Vanilya Şuruplu', 'Fındık Şuruplu', 'Çikolata Şuruplu', 'Çilek Şuruplu', 'Muz Şuruplu',
    'Limonlu', 'Limonsuz', 'Nane Yapraklı', 'Tarçınlı', 'Krema Üzeri Toz Tarçın'
];

async function seedModifiers() {
    try {
        console.log('Connecting to database...');
        let pool = await sql.connect(config);
        console.log('Connected to MSSQL Database!');

        console.log('Seeding modifiers table...');
        let insertedCount = 0;
        let existedCount = 0;

        for (const mod of modifiers) {
            const check = await pool.request()
                .input('name', sql.NVarChar, mod)
                .query('SELECT id FROM modifiers WHERE name = @name');

            if (check.recordset.length === 0) {
                await pool.request()
                    .input('name', sql.NVarChar, mod)
                    .query('INSERT INTO modifiers (name, createdAt, updatedAt) VALUES (@name, GETDATE(), GETDATE())');
                console.log(`+ Inserted: ${mod}`);
                insertedCount++;
            } else {
                console.log(`- Exists: ${mod}`);
                existedCount++;
            }
        }
        console.log(`\nSeeding finished! Inserted: ${insertedCount}, Skipped: ${existedCount}, Total Processed: ${modifiers.length}`);

        await pool.close();
    } catch (err) {
        console.error('Error seeding database:', err);
    }
}

seedModifiers();
