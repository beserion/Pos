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
import { PrintersModule } from './printers/printers.module';
import { RecipesModule } from './recipes/recipes.module';
import { WastagesModule } from './wastages/wastages.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { User } from './users/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
<<<<<<< HEAD
      useFactory: (configService: ConfigService) => {
        const instanceName = configService.get<string>('DB_INSTANCE');
        const config: any = {
          type: 'mssql',
          host: configService.get<string>('DB_HOST', 'localhost'),
          username: configService.get<string>('DB_USERNAME', 'sa'),
          password: configService.get<string>('DB_PASSWORD', 'YourStrong@Passw0rd'),
          database: configService.get<string>('DB_DATABASE', 'AntigravityPOS'),
          autoLoadEntities: true,
          synchronize: false, // Tables created by SQL script
          options: {
            encrypt: false,
            trustServerCertificate: true,
            ...(instanceName ? { instanceName } : {}),
          },
        };
        // When using a named instance, don't specify port (uses dynamic port via SQL Browser)
        if (!instanceName) {
          config.port = parseInt(configService.get<string>('DB_PORT', '1433'), 10);
        }
        return config;
      },
=======
      useFactory: (configService: ConfigService) => ({
        type: 'mssql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('DB_PORT', '1433'), 10),
        username: configService.get<string>('DB_USERNAME', 'sa'),
        password: configService.get<string>('DB_PASSWORD', 'YourStrong@Passw0rd'),
        database: configService.get<string>('DB_DATABASE', 'AntigravityPOS'),
        autoLoadEntities: true,
        synchronize: false, // Auto-create tables for MVP
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
      }),
>>>>>>> master
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
    PrintersModule,
    RecipesModule,
    WastagesModule,
    PurchaseOrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }