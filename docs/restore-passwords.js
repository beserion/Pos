const sql = require('mssql');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
dotenv.config();

const config = {
    server: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    options: { encrypt: false, trustServerCertificate: true }
};

async function restorePasswords() {
    const pool = await sql.connect(config);
    const users = await pool.request().query('SELECT id, email, passwordClearText FROM users');

    console.log(`${users.recordset.length} kullanıcı bulundu.`);

    for (const u of users.recordset) {
        if (u.passwordClearText) {
            const hash = await bcrypt.hash(u.passwordClearText, 10);
            await pool.request().query(`UPDATE users SET passwordHash='${hash}' WHERE id=${u.id}`);
            console.log(`✓ ${u.email} -> hash güncellendi (şifre: ${u.passwordClearText})`);
        } else {
            console.log(`⚠ ${u.email} -> passwordClearText boş, atlandı`);
        }
    }

    pool.close();
    console.log('\nTamamlandı. Tüm şifreler orijinal cleartext değerlerinden yeniden hash\'lendi.');
}

restorePasswords().catch(e => console.error('Hata:', e.message));
