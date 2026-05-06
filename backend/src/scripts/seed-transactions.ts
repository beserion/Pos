import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const ds = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '1433'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: process.env.DB_INSTANCE,
    },
});

async function seed() {
    try {
        console.log('Connecting to database...');
        await ds.initialize();
        console.log('Connected!');

        const partners = await ds.query('SELECT id, name, type FROM partners');
        console.log(`Found ${partners.length} partners.`);

        const transactions = [];
        const now = new Date();

        for (const partner of partners) {
            const numTxs = Math.floor(Math.random() * 3) + 3; // 3 to 5 transactions per partner

            for (let i = 0; i < numTxs; i++) {
                const date = new Date(now);
                date.setDate(now.getDate() - Math.floor(Math.random() * 30)); // Last 30 days
                date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

                const amount = Math.floor(Math.random() * 4900) + 100;
                let type, description, category, paymentMethod, sourceType;

                if (partner.type === 'CUSTOMER') {
                    // Half Sales, half Collections
                    if (Math.random() > 0.5) {
                        type = 'EXPENSE';
                        description = `Satış Faturası #${Math.floor(Math.random() * 9000) + 1000}`;
                        category = 'Satış';
                        sourceType = 'SALE_INVOICE';
                        paymentMethod = 'KASA';
                    } else {
                        type = 'INCOME';
                        description = `Tahsilat - Nakit/Banka`;
                        category = 'Tahsilat';
                        sourceType = 'MANUAL';
                        paymentMethod = Math.random() > 0.5 ? 'KASA' : 'BANKA';
                    }
                } else {
                    // Half Purchases, half Payments
                    if (Math.random() > 0.5) {
                        type = 'INCOME';
                        description = `Alış Faturası #${Math.floor(Math.random() * 9000) + 1000}`;
                        category = 'Alım';
                        sourceType = 'PURCHASE_INVOICE';
                        paymentMethod = 'KASA';
                    } else {
                        type = 'EXPENSE';
                        description = `Tedarikçi Ödemesi`;
                        category = 'Ödeme';
                        sourceType = 'MANUAL';
                        paymentMethod = Math.random() > 0.5 ? 'BANKA' : 'KREDI_KARTI';
                    }
                }

                transactions.push({
                    amount,
                    type,
                    description,
                    sourceType,
                    paymentMethod,
                    category,
                    partnerId: partner.id,
                    createdAt: date.toISOString(),
                    updatedAt: date.toISOString(),
                });
            }
        }

        console.log(`Inserting ${transactions.length} transactions...`);

        // Insert in batches
        for (const tx of transactions) {
            await ds.query(
                `INSERT INTO account_transactions (amount, type, description, sourceType, paymentMethod, category, partnerId, createdAt, updatedAt) 
         VALUES (@0, @1, @2, @3, @4, @5, @6, @7, @8)`,
                [tx.amount, tx.type, tx.description, tx.sourceType, tx.paymentMethod, tx.category, tx.partnerId, tx.createdAt, tx.updatedAt]
            );
        }

        console.log('Seed completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
}

seed();
