const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    options: { encrypt: false, trustServerCertificate: true },
};

async function addCashiers() {
    try {
        await sql.connect(config);

        // Ensure Kasiyer role exists
        const roleCheck = await sql.query("SELECT id FROM roles WHERE name = 'Kasiyer'");
        let roleId;
        if (roleCheck.recordset.length > 0) {
            roleId = roleCheck.recordset[0].id;
        } else {
            console.log('Kasiyer role not found, creating it...');
            const insertRole = await sql.query("INSERT INTO roles (name, description) OUTPUT INSERTED.id VALUES ('Kasiyer', 'Kasada duran görevli')");
            roleId = insertRole.recordset[0].id;
        }

        console.log('Role ID for Kasiyer:', roleId);

        // Delete any existing default cashiers to avoid conflicts
        await sql.query("DELETE FROM users WHERE email IN ('kasiyer1@antigravity.com', 'kasiyer2@antigravity.com')");

        // Insert new cashiers
        const hash1 = '$2b$10$OcmzeFTzeXr5i5jZe5jEv.LPFPWcavSRjj2UVpUZPuhHS4gbGr5lr.'; // Using generic 123456 hash

        await sql.query(`
            INSERT INTO users (firstName, lastName, email, tempPassword, passwordHash, passwordClearText, pinCode, roleId, isActive, createdAt, updatedAt)
            VALUES ('Cem', 'Kasa', 'kasiyer1@antigravity.com', '', '${hash1}', '123456', '8888', ${roleId}, 1, GETDATE(), GETDATE())
        `);

        await sql.query(`
            INSERT INTO users (firstName, lastName, email, tempPassword, passwordHash, passwordClearText, pinCode, roleId, isActive, createdAt, updatedAt)
            VALUES ('Ayşe', 'Kasiyer', 'kasiyer2@antigravity.com', '', '${hash1}', '123456', '9999', ${roleId}, 1, GETDATE(), GETDATE())
        `);

        console.log('Successfully added 2 Kasiyer users:');
        console.log('1. Cem Kasa (PIN: 8888)');
        console.log('2. Ayşe Kasiyer (PIN: 9999)');

    } catch (err) {
        console.error('SQL Error:', err);
    } finally {
        await sql.close();
    }
}

addCashiers();
