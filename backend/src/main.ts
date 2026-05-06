import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import { UsersService } from './users/users.service';
import { Repository } from 'typeorm';
import { Role } from './roles/role.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Seed Admin user if not exists
  const usersService = app.get(UsersService);
  const roleRepo: Repository<Role> = app.get(getRepositoryToken(Role));

  let adminRole = await roleRepo.findOne({ where: { name: 'Admin' } });
  if (!adminRole) {
    adminRole = roleRepo.create({
      name: 'Admin',
      description: 'Administrator',
      permissions: ['ALL'],
    });
    adminRole = await roleRepo.save(adminRole);
  }

  const adminEmail = 'admin@admin.com';
  let admin = await usersService.findByEmail(adminEmail);
  if (!admin) {
    admin = await usersService.create({
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      passwordHash: 'admin123',
      passwordClearText: 'admin123',
      role: adminRole,
    });
    console.log('Seed: Admin user created (admin@admin.com / admin123)');
  } else if (!admin.role || admin.role.id !== adminRole.id) {
    // Force assign role if missing or different (to ensure Admin always has access)
    await usersService.update(admin.id, { role: adminRole });
    console.log('Seed: Admin role enforced for existing user.');
  }

  // Increase payload size limit
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS - Tüm originlere ve headerlara tam izin ver (CORS kısıtlamalarını tamamen kaldırmak için)
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Her türlü origin'e (localhost, production domainleri vs.) izin ver
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: '*',
    exposedHeaders: '*', // Client tarafında tüm headerların okunabilmesi için
  });

  const config = new DocumentBuilder()
    .setTitle('Antigravity POS API')
    .setDescription('Backend API for Antigravity Cloud POS ERP system.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3050;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();
