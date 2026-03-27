import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  const logs = await dataSource.query('SELECT top 10 * FROM audit_logs ORDER BY id DESC');
  console.log('AUDIT LOGS IN DB:');
  console.log(JSON.stringify(logs, null, 2));

  await app.close();
}
bootstrap();
