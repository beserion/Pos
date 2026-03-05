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
    adminRole = roleRepo.create({ name: 'Admin', description: 'Administrator', permissions: ['ALL'] });
    adminRole = await roleRepo.save(adminRole);
  }

  const adminEmail = 'admin@admin.com';
  const adminExists = await usersService.findByEmail(adminEmail);
  if (!adminExists) {
    await usersService.create({
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      passwordHash: 'admin123',
      passwordClearText: 'admin123',
      role: adminRole
    });
    console.log('Seed: Admin user created (admin@admin.com / admin123)');
  }

  // Increase payload size limit
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
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
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
