import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { InvoicesService } from './src/invoices/invoices.service';
import { DataSource } from 'typeorm';

async function runSeed() {
  console.log('Starting seed...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const invoicesService = app.get(InvoicesService);
  const dataSource = app.get(DataSource);

  console.log('Seeding Invoices...');
  try {
    const invRes = await invoicesService.seedTestData();
    console.log(invRes.msg || invRes);
  } catch (err) {
    console.error('Invoice seed error:', err.message);
  }

  console.log('Seeding 10 Reservations...');
  try {
    for (let i = 1; i <= 10; i++) {
        // Next 10 days at 20:00
        const rDate = new Date();
        rDate.setDate(rDate.getDate() + i);
        rDate.setHours(20, 0, 0, 0);

        const formattedDate = rDate.toISOString().slice(0, 19).replace('T', ' ');

        const statuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'ARRIVED'];
        const randomStatus = statuses[i % 4];

        await dataSource.query(`
            INSERT INTO reservations (
                customerName, 
                customerPhone, 
                reservationTime, 
                guestCount, 
                notes,
                status, 
                createdAt,
                updatedAt
            ) VALUES (
                'Örnek Müşteri ${i}', 
                '+90 555 444 33 ${String((i*11)%99).padStart(2, '0')}', 
                '${formattedDate}', 
                ${(i % 5) + 2}, 
                'Özel not (örnek)',
                '${randomStatus}',
                GETDATE(),
                GETDATE()
            )
        `);
    }
    console.log('10 reservations created successfully.');
  } catch (err) {
  }

  console.log('Seeding System Parameters...');
  try {
    await dataSource.query(`
      IF NOT EXISTS (SELECT 1 FROM system_parameters WHERE [module] = 'pos' AND [key] = 'business_day_start_hour')
      BEGIN
        INSERT INTO system_parameters ([module], [key], [value], [type], [label], [description])
        VALUES ('pos', 'business_day_start_hour', '04:00', 'time', 'Gece Dönüş Saati', 'İş gününün hangi saatte sıfırlanacağını belirler.')
      END
    `);
    console.log('System Parameters seeded successfully.');
  } catch (err) {
    console.error('System parameters seed error:', err.message);
  }

  await app.close();
  console.log('Seeding complete.');
}

runSeed();
