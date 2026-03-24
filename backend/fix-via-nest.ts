import { NestFactory } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const instanceName = configService.get<string>('DB_INSTANCE');
        const config: any = {
          type: 'mssql',
          host: configService.get<string>('DB_HOST', 'localhost'),
          username: configService.get<string>('DB_USERNAME', 'sa'),
          password: configService.get<string>('DB_PASSWORD', 'YourStrong@Passw0rd'),
          database: configService.get<string>('DB_DATABASE', 'AntigravityPOS'),
          synchronize: false, // ÖNEMLİ
          options: {
            encrypt: true,
            trustServerCertificate: true,
            ...(instanceName ? { instanceName } : {}),
          },
        };
        if (!instanceName) {
          config.port = parseInt(configService.get<string>('DB_PORT', '1433'), 10);
        }
        return config;
      },
    }),
  ],
})
class MiniAppModule {}

async function bootstrap() {
  console.log('Nest ortamı başlatılıyor...');
  const app = await NestFactory.createApplicationContext(MiniAppModule);
  const dataSource = app.get(DataSource);
  
  try {
      console.log('Veritabanına bağlanıldı. DROP işlemleri yapılıyor...');
      
      // İlişkileri düşür
      try {
        await dataSource.query(`ALTER TABLE products DROP CONSTRAINT FK_4f16b222d4a7962453896dfa342`); // products.outputProfileId constraint (tahmini isim, gerekirse DROP TABLE da fail olur)
      } catch(e) {}

      try {
        await dataSource.query(`ALTER TABLE departments DROP CONSTRAINT FK_...`); 
      } catch(e) {}

      // Foreign key constraints that refer to output_profiles need to be dropped first.
      // MSSQL'de bir tabloyu drop etmek için ona referans veren FK'leri drop etmeliyiz.
      // Aşağıdaki script dinamik olarak output_profiles'a referans veren tüm FK'leri bulur ve siler:
      
      const dropFKsQuery = `
        DECLARE @sql NVARCHAR(MAX) = N'';
        SELECT @sql += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id))
            + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) 
            + ' DROP CONSTRAINT ' + QUOTENAME(name) + ';'
        FROM sys.foreign_keys 
        WHERE referenced_object_id = OBJECT_ID('output_profiles');
        EXEC sp_executesql @sql;
      `;
      await dataSource.query(dropFKsQuery);
      console.log('Tabloya referans veren mevcut FK kısıtlamaları silindi.');

      // Şimdi tabloyu drop et
      await dataSource.query(`DROP TABLE output_profiles`);
      console.log('output_profiles tablosu başarıyla SİLİNDİ!');
      
  } catch(e) {
      console.log('İşlem sırasında bir hata:', e.message);
  }
  
  await app.close();
  process.exit(0);
}
bootstrap();
