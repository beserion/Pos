const sql = require('mssql');
const config = {
    user: 'sa',
    password: 'Oryx123!',
    server: '149.34.201.35',
    port: 1433,
    database: 'AntigravityPOS',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        console.log('Connecting to remote DB...');
        await sql.connect(config);
        console.log('Connected.');

        // 0. Create Tables if not exist
        console.log('Ensuring tables exist...');
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'purchase_orders')
            CREATE TABLE [purchase_orders] (
                [id] int NOT NULL IDENTITY(1,1),
                [supplierId] int,
                [status] nvarchar(255) NOT NULL DEFAULT 'DRAFT',
                [totalAmount] decimal(12,2) NOT NULL DEFAULT 0,
                [note] nvarchar(max),
                [invoiceNumber] nvarchar(100),
                [invoiceDateStr] nvarchar(20),
                [invoiceAmount] decimal(12,2),
                [paymentStatus] nvarchar(255) NOT NULL DEFAULT 'UNPAID',
                [paymentMethod] nvarchar(50),
                [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
                [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
                CONSTRAINT [PK_purchase_orders] PRIMARY KEY ([id])
            )
        `);

        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'purchase_order_items')
            CREATE TABLE [purchase_order_items] (
                [id] int NOT NULL IDENTITY(1,1),
                [purchaseOrderId] int,
                [productId] int,
                [quantity] decimal(12,2) NOT NULL DEFAULT 0,
                [unitPrice] decimal(12,2) NOT NULL DEFAULT 0,
                [unit] nvarchar(20),
                [createdAt] datetime2 NOT NULL DEFAULT GETDATE(),
                [updatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
                CONSTRAINT [PK_purchase_order_items] PRIMARY KEY ([id])
            )
        `);
        console.log('Tables are ready.');

        // 1. Get or Create Supplier
        const partners = await sql.query("SELECT id FROM partners WHERE type='SUPPLIER'");
        let supplierId;
        if (partners.recordset.length > 0) {
            supplierId = partners.recordset[0].id;
        } else {
            console.log('Creating sample supplier...');
            const r = await sql.query("INSERT INTO partners (name, type, isActive, createdAt, updatedAt) OUTPUT INSERTED.id VALUES ('Ornek Tedarikci AS', 'SUPPLIER', 1, GETDATE(), GETDATE())");
            supplierId = r.recordset[0].id;
        }
        console.log('Supplier ID:', supplierId);

        // 2. Get Products
        const products = await sql.query("SELECT TOP 5 id, name, costPrice, unit FROM products");
        if (products.recordset.length === 0) {
            console.error('No products found to create items. Please add some products first.');
            process.exit(1);
        }

        // 3. Delete existing POs to have a clean start (Optional, but user said they don't see them)
        await sql.query("DELETE FROM purchase_order_items");
        await sql.query("DELETE FROM purchase_orders");

        // 4. Create 5 Sample Purchase Orders
        for (let i = 1; i <= 5; i++) {
            const status = i % 3 === 0 ? 'RECEIVED' : (i % 2 === 0 ? 'SENT' : 'DRAFT');
            const note = `Otomatik Örnek Sipariş #${i}`;
            
            // Calculate total for the items we will add
            const itemsCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
            let totalAmount = 0;
            const itemsToAdd = [];

            for (let j = 0; j < itemsCount; j++) {
                const prod = products.recordset[j % products.recordset.length];
                const qty = (j + 1) * 5;
                const price = Number(prod.costPrice || 10);
                totalAmount += qty * price;
                itemsToAdd.push({ id: prod.id, qty, price, unit: prod.unit || 'adet' });
            }

            const poQuery = `
                INSERT INTO purchase_orders (supplierId, status, totalAmount, note, createdAt, updatedAt, paymentStatus) 
                OUTPUT INSERTED.id 
                VALUES (${supplierId}, '${status}', ${totalAmount}, '${note}', GETDATE(), GETDATE(), 'UNPAID')
            `;
            const poRes = await sql.query(poQuery);
            const poId = poRes.recordset[0].id;
            console.log(`PO #${i} created with ID: ${poId}`);

            for (const item of itemsToAdd) {
                await sql.query(`
                    INSERT INTO purchase_order_items (purchaseOrderId, productId, quantity, unitPrice, unit, createdAt, updatedAt)
                    VALUES (${poId}, ${item.id}, ${item.qty}, ${item.price}, '${item.unit}', GETDATE(), GETDATE())
                `);
            }
        }

        console.log('Successfully created 5 sample purchase orders with items on remote DB.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

run();
