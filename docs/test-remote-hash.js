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

async function testPassword() {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT * FROM users WHERE email='admin@antigravity.com'");
        if (result.recordset.length === 0) {
            console.log("Admin user not found.");
            return;
        }

        const user = result.recordset[0];
        console.log(`User: ${user.email}`);
        console.log(`Stored passwordHash: ${user.passwordHash}`);

        const isMatch = await bcrypt.compare('123456', user.passwordHash);
        console.log(`Does '123456' match passwordHash? ${isMatch}`);

        await pool.close();
    } catch (err) {
        console.error("Error:", err);
    }
}

testPassword();
