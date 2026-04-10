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

  // Enable CORS
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow all origins in development
      if (!origin || origin.indexOf('localhost') !== -1 || origin.indexOf('127.0.0.1') !== -1 || origin.indexOf('192.168.') !== -1) {
        callback(null, true);
        return;
      }
      const allowedOrigins = [
        'https://pos.beserion.com.tr',
        'https://posbackend.beserion.com.tr',
        'https://api.posnetx.com',
        'https://posnetx.com',
        'https://apitest.posnetx.com',
        'https://test.posnetx.com',
        'https://localhost:5173',
        'wss://test.posnetx.com',
        'wss://apitest.posnetx.com',
        'http://localhost:3000',
        'http://localhost:3001',
      ];
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
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
