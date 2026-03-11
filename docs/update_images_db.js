const { DataSource } = require('typeorm');

const ds = new DataSource({
    type: 'mssql',
    host: '149.34.201.35',
    port: 1433,
    username: 'sa',
    password: 'Oryx123!',
    database: 'AntigravityPOS',
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    synchronize: false
});

ds.initialize()
    .then(async () => {
        try {
            await ds.query("UPDATE products SET imageUrl = 'https://picsum.photos/400/400?random=' + CAST(id AS VARCHAR(10)) WHERE imageUrl IS NULL OR CAST(imageUrl AS NVARCHAR(MAX)) = ''");
            await ds.query("UPDATE products SET isQuickSale = 1");
            console.log('Images and QuickSale updated successfully');
        } catch (e) {
            console.error('Query error:', e);
        }
        process.exit(0);
    })
    .catch(e => {
        console.error('Connection error:', e);
        process.exit(1);
    });
