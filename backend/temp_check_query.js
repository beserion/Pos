const mssql = require('mssql');
require('dotenv').config();
const config = {
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'posnetx',
    server: 'localhost',
    database: process.env.DB_DATABASE || 'Posnetx',
    options: { encrypt: false, trustServerCertificate: true }
};
async function run() {
    try {
        await mssql.connect(config);
        const res = await mssql.query(`
          SELECT 
            si.id as id,
            s.tableName as tableName,
            s.id as saleId,
            COALESCE(si.addedAt, s.createdAt) as transactionDate,
            COALESCE(u.firstName + ' ' + u.lastName, 'Sistem') as staffName,
            p.name as productName,
            CAST(si.quantity AS DECIMAL(18,2)) as quantity,
            COALESCE(si.productTypeName, 'Diğer') as productTypeName,
            si.transactionType as transactionType,
            si.transactionReason as transactionReason,
            CAST(si.unitPrice AS DECIMAL(18,2)) as unitPrice,
            CAST(si.total AS DECIMAL(18,2)) as total,
            CAST(COALESCE(p.price, 0) AS DECIMAL(18,2)) as retailPrice
          FROM sale_items si
          JOIN sales s ON s.id = si.saleId
          LEFT JOIN products p ON p.id = si.productId
          LEFT JOIN users u ON u.id = COALESCE(si.addedByUserId, s.waiterId)
          WHERE si.transactionType != 'SALE' 
            AND si.status = 'ACTIVE'
            AND s.status = 'COMPLETED'
            AND s.businessDate >= '2026-05-20' AND s.businessDate <= '2026-05-20'
        `);
        console.log('Query result:');
        console.table(res.recordset);
    } catch (e) {
        console.error(e);
    } finally {
        await mssql.close();
    }
}
run();
