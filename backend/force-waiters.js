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

async function run() {
    try {
        await sql.connect(config);

        const roles = await sql.query("SELECT id, name FROM [dbo].[roles]");
        console.log("ROLES_DATA:", JSON.stringify(roles.recordset));

        const users = await sql.query(`
            SELECT u.id, u.firstName, u.lastName, u.email, u.pinCode, r.name as roleName 
            FROM [dbo].[users] u
            LEFT JOIN [dbo].[roles] r ON u.roleId = r.id
        `);
        console.log("USERS_DATA:", JSON.stringify(users.recordset));

        // Update ROLE 'Garson' or 'Waiter' to have a consistent name
        // And assign some pins
        await sql.query(`
            UPDATE [dbo].[roles] SET [name] = 'Garson' WHERE [name] IN ('Waiter', 'waiter', 'GARSON');
            UPDATE [dbo].[users] SET [pinCode] = '1234' WHERE [pinCode] IS NULL OR [pinCode] = '';
        `);
        console.log("Update completed.");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sql.close();
    }
}

run();
