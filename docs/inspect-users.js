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

        console.log("Roles List:");
        const roles = await sql.query("SELECT id, name FROM [dbo].[roles]");
        console.table(roles.recordset);

        console.log("Users List:");
        const users = await sql.query(`
            SELECT u.id, u.firstName, u.lastName, u.email, u.pinCode, r.name as roleName 
            FROM [dbo].[users] u
            LEFT JOIN [dbo].[roles] r ON u.roleId = r.id
        `);
        console.table(users.recordset);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sql.close();
    }
}

run();
