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

const groupedModifiers = [
    { group: 'Et ve Pişirme', modifiers: ['Az Pişmiş', 'Orta Pişmiş', 'İyi Pişmiş', 'Çok Pişmiş', 'Az Yağlı', 'Bol Yağlı'] },
    { group: 'Soslar & İçerikler', modifiers: ['Ketçaplı', 'Ketçapsız', 'Mayonezli', 'Mayonezsiz', 'Hardallı', 'Hardalsız', 'Acı Soslu', 'Sarımsaklı Mayonezli', 'Ranch Soslu', 'Barbekü Soslu', 'Ballı Hardallı', 'Soğanlı', 'Soğansız', 'Karameleze Soğanlı', 'Turşulu', 'Turşusuz', 'Domatesli', 'Domatessiz', 'Marullu', 'Marulsuz', 'Jalapeno Biberli', 'Meksika Fasulyeli', 'Zeytinli', 'Mantarlı', 'Mısırlı', 'Baharatlı', 'Baharat Değmesin', 'Tuzsuz', 'Az Tuzlu', 'Bol Tuzlu'] },
    { group: 'Peynirler', modifiers: ['Ekstra Peynirli', 'Kaşarlı', 'Kaşarsız', 'Cheddar Peynirli', 'Tulum Peynirli', 'Beyaz Peynirli', 'Ezine Peynirli'] },
    { group: 'Ekmek/Karbonhidrat', modifiers: ['Kepekli Ekmeğe', 'Tam Buğday Ekmeğine', 'Glutensiz Ekmek', 'Lavaş Arası', 'Ekmeksiz', 'Esmer Tortilla'] },
    { group: 'Boyutlar', modifiers: ['Küçük Porsiyon', 'Büyük Porsiyon', 'Çocuk Boy', 'Diyet Porsiyon', 'Ekstra Porsiyon'] },
    { group: 'İçecekler: Isı & Buz', modifiers: ['Sıcak', 'Ilık', 'Ekstra Sıcak', 'Buzlu', 'Buzsuz', 'Az Buzlu', 'Bol Buzlu', 'Frappe (Kırık Buz)'] },
    { group: 'İçecekler: Kahve ve Süt', modifiers: ['Sütlü', 'Sütsüz', 'Az Sütlü', 'Bol Sütlü', 'Soya Sütlü', 'Badem Sütlü', 'Yulaf Sütlü', 'Hindistan Cevizi Sütlü', 'Laktozsuz Sütlü', 'Kremalı', 'Kremasız', 'Ekstra Sentetik Krema', 'Az Kremalı', 'Ekstra Shot Espresso', 'Yarım Shot Espresso'] },
    { group: 'İçecekler: Tatlandırıcı & Şurup', modifiers: ['Şekerli', 'Şekersiz', 'Az Şekerli', 'Orta Şekerli', 'Esmer Şekerli', 'Tatlandırıcılı', 'Karamel Şuruplu', 'Vanilya Şuruplu', 'Fındık Şuruplu', 'Çikolata Şuruplu', 'Çilek Şuruplu', 'Muz Şuruplu', 'Limonlu', 'Limonsuz', 'Nane Yapraklı', 'Tarçınlı', 'Krema Üzeri Toz Tarçın'] }
];

async function seedModifiersGrouped() {
    try {
        console.log('Connecting to database...');
        let pool = await sql.connect(config);
        console.log('Connected to MSSQL Database!');

        console.log('Checking for groupName column in modifiers table...');
        await pool.request().query(`
            IF COL_LENGTH('modifiers', 'groupName') IS NULL
            BEGIN
                ALTER TABLE modifiers ADD groupName NVARCHAR(255) NULL;
            END
        `);
        console.log('Schema ready.');

        console.log('Seeding grouped modifiers...');
        let updatedCount = 0;
        let insertedCount = 0;

        for (const groupData of groupedModifiers) {
            const groupName = groupData.group;
            for (const mod of groupData.modifiers) {
                const check = await pool.request()
                    .input('name', sql.NVarChar, mod)
                    .query('SELECT id FROM modifiers WHERE name = @name');

                if (check.recordset.length === 0) {
                    await pool.request()
                        .input('name', sql.NVarChar, mod)
                        .input('groupName', sql.NVarChar, groupName)
                        .query('INSERT INTO modifiers (name, groupName, createdAt, updatedAt) VALUES (@name, @groupName, GETDATE(), GETDATE())');
                    console.log(`+ Inserted: ${mod} (${groupName})`);
                    insertedCount++;
                } else {
                    await pool.request()
                        .input('name', sql.NVarChar, mod)
                        .input('groupName', sql.NVarChar, groupName)
                        .query('UPDATE modifiers SET groupName = @groupName, updatedAt = GETDATE() WHERE name = @name');
                    console.log(`~ Updated: ${mod} (${groupName})`);
                    updatedCount++;
                }
            }
        }
        console.log(`\\nSeeding finished! Inserted: ${insertedCount}, Updated: ${updatedCount}`);

        await pool.close();
    } catch (err) {
        console.error('Error seeding database:', err);
    }
}

seedModifiersGrouped();
