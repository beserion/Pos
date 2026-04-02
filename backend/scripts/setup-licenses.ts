import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Firm } from '../src/firms/firm.entity';
import { User } from '../src/users/user.entity';

dotenv.config();

async function run() {
  const config: any = {
    type: 'mssql',
    host: process.env.DB_HOST || 'localhost',
    username: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
    database: process.env.DB_DATABASE || 'AntigravityPOS',
    entities: [Firm, User],
    options: {
      encrypt: true,
      trustServerCertificate: true,
      ...(process.env.DB_INSTANCE ? { instanceName: process.env.DB_INSTANCE } : {}),
    },
    synchronize: true,
  };

  if (!process.env.DB_INSTANCE) {
    config.port = parseInt(process.env.DB_PORT || '1433', 10);
  }

  const dataSource = new DataSource(config);

  try {
    await dataSource.initialize();
    console.log('Veritabanına bağlanıldı.');

    // Firmaları bul
    let firmRepository = dataSource.getRepository(Firm);
    let userRepository = dataSource.getRepository(User);

    let firm = await firmRepository.findOne({ where: { name: 'Demo Lisans Firması' } });
    if (!firm) {
      firm = firmRepository.create({
        name: 'Demo Lisans Firması',
        isActive: true,
        activeFeatures: ['waiter_app', 'delivery_system', 'kds'], // recipe_system YOK!
      });
      await firmRepository.save(firm);
      console.log('Demo Firma oluşturuldu. (Reçete Sistemi KAPALI)');
    } else {
      firm.activeFeatures = ['waiter_app', 'delivery_system', 'kds'];
      await firmRepository.save(firm);
      console.log('Demo Firma güncellendi. (Reçete Sistemi KAPALI)');
    }

    // Tüm ana kullanıcılara bu firmayı atayalım (Örn ID'si 1 olan veya tüm adminler vb.)
    // Basitçe sistemdeki tüm kullanıcılara bağlayalım ki teste görebilsin
    const users = await userRepository.find();
    for (const u of users) {
      u.firm = firm;
      await userRepository.save(u);
    }
    console.log(`Tüm kullanıcılara (${users.length} kişi) Demo Firma atandı.`);

    console.log('İşlem Tamamlandı. Lütfen web sitesinden ÇIKIŞ yapıp TEKRAR GİRİŞ yapın!');

  } catch (err) {
    console.error('Hata:', err);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

run();
