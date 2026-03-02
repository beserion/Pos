import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { StocksModule } from './stocks/stocks.module';
import { SalesModule } from './sales/sales.module';
import { InvoicesModule } from './invoices/invoices.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { AuthModule } from './auth/auth.module';
import { LocationsModule } from './locations/locations.module';
import { TablesModule } from './tables/tables.module';
import { EmployeesModule } from './employees/employees.module';
import { ZonesModule } from './zones/zones.module';
import { PartnersModule } from './partners/partners.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { FinanceModule } from './finance/finance.module';
import { OrdersModule } from './orders/orders.module';
import { SecurityModule } from './auth/security.module';
import { User } from './users/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mssql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('DB_PORT', '1433'), 10),
        username: configService.get<string>('DB_USERNAME', 'sa'),
        password: configService.get<string>('DB_PASSWORD', 'YourStrong@Passw0rd'),
        database: configService.get<string>('DB_DATABASE', 'AntigravityPOS'),
        autoLoadEntities: true,
        synchronize: true, // Auto-create tables for MVP
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
      }),
    }),
    RolesModule,
    UsersModule,
    ProductsModule,
    StocksModule,
    SalesModule,
    InvoicesModule,
    DeliveriesModule,
    AuthModule,
    LocationsModule,
    TablesModule,
    EmployeesModule,
    ZonesModule,
    PartnersModule,
    WarehousesModule,
    FinanceModule,
    OrdersModule,
    SecurityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }