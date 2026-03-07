const sql = require('mssql');
const fs = require('fs');

const config = {
    user: 'sa',
    password: 'YourStrong@Passw0rd',
    server: 'localhost',
    database: 'AntigravityPOS',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function exportDatabase() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);
        console.log('Connected! Extracting schema and data...');

        let outputSql = `USE [AntigravityPOS];\nGO\n\n`;

        // 1. Get Tables
        const tablesResult = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
        `);

        const tables = tablesResult.recordset.map(t => t.TABLE_NAME);

        // 2. Extract Data for each table
        for (const table of tables) {
            console.log(`Exporting table: ${table}...`);
            outputSql += `\n-- Table Data: ${table}\n`;

            // Allow identity insert if there is an identity column
            const idColRes = await pool.request().query(`
                SELECT c.name 
                FROM sys.columns c
                JOIN sys.tables t ON c.object_id = t.object_id
                WHERE t.name = '${table}' AND c.is_identity = 1
            `);
            const hasIdentity = idColRes.recordset.length > 0;

            if (hasIdentity) {
                outputSql += `SET IDENTITY_INSERT [${table}] ON;\nGO\n`;
            }

            const dataResult = await pool.request().query(`SELECT * FROM [${table}]`);

            if (dataResult.recordset.length > 0) {
                const columns = Object.keys(dataResult.recordset[0]);
                const colString = columns.map(c => `[${c}]`).join(', ');

                for (const row of dataResult.recordset) {
                    const values = columns.map(col => {
                        const val = row[col];
                        if (val === null || val === undefined) return 'NULL';
                        if (typeof val === 'number') return val;
                        if (typeof val === 'boolean') return val ? 1 : 0;
                        if (val instanceof Date) return `'${val.toISOString().replace('T', ' ').replace('Z', '')}'`;
                        return `N'${String(val).replace(/'/g, "''")}'`;
                    });

                    outputSql += `INSERT INTO [${table}] (${colString}) VALUES (${values.join(', ')});\n`;
                }
            }

            if (hasIdentity) {
                outputSql += `SET IDENTITY_INSERT [${table}] OFF;\nGO\n`;
            }
        }

        fs.writeFileSync('AntigravityPOS_Full_Data.sql', outputSql);
        console.log('\nExport completed! Saved to AntigravityPOS_Full_Data.sql');

        await pool.close();
    } catch (err) {
        console.error('Export failed:', err.message);
    }
}

exportDatabase();
