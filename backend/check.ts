import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Firm } from './src/firms/firm.entity';
import { User } from './src/users/user.entity';

dotenv.config();

async function run() {
  const dataSource = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST || 'localhost',
    username: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    entities: [Firm, User],
    options: {
      encrypt: true,
      trustServerCertificate: true,
      ...(process.env.DB_INSTANCE ? { instanceName: process.env.DB_INSTANCE } : {}),
    },
  });

  await dataSource.initialize();
  const user = await dataSource.getRepository(User).findOne({where: {id: 1}, relations: ['firm']});
  console.log('FIRM OF USER 1:', user?.firm);

  await dataSource.destroy();
}
run().catch(console.error);
