import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';
import { AccountTransaction } from './src/finance/account-transaction.entity';
import { Partner } from './src/partners/partner.entity';
import { CompanyAccount } from './src/finance/company-account.entity';
import { User } from './src/users/user.entity';

const dataSource = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST || 'localhost',
    username: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'Oryx123!',
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    entities: [AccountTransaction, Partner, CompanyAccount, User],
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
});

async function run() {
    await dataSource.initialize();
    console.log('Connected.');
    
    const accountId = 2;
    const page = 1;
    const limit = 20;
    const search = '';

    const query = dataSource.getRepository(AccountTransaction).createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.partner', 'partner')
      .where('transaction.companyAccountId = :accountId', { accountId });

    if (search) {
      query.andWhere(
        '(transaction.description LIKE :search OR partner.name LIKE :search)',
        { search: `%${search}%` }
      );
    }

    try {
        const [data, total] = await query
          .orderBy('transaction.createdAt', 'DESC')
          .skip((page - 1) * limit)
          .take(limit)
          .getManyAndCount();
        console.log('Success! Total:', total);
        console.log('First Doc Num:', data[0]?.documentNumber);
    } catch (err: any) {
        console.error('FAILED:', err.message);
    }

    await dataSource.destroy();
}

run().catch(console.error);
