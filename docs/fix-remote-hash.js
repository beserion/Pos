const sql = require('mssql');
const bcrypt = require('bcrypt');

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

async function fixHash() {
    try {
        const pool = await sql.connect(config);

        // Generate a new proper bcrypt hash for '123456'
        const newHash = await bcrypt.hash('123456', 10);
        console.log(`Generated new hash: ${newHash}`);

        // Update all users with the bad hash
        const res = await pool.request()
            .input('hash', sql.NVarChar, newHash)
            .query("UPDATE users SET passwordHash = @hash, passwordClearText = '123456' WHERE email IN ('admin@antigravity.com', 'kasa@antigravity.com', 'garson@antigravity.com')");

        console.log(`Updated ${res.rowsAffected} users.`);
        await pool.close();
    } catch (err) {
        console.error("Error:", err);
    }
}

fixHash();
