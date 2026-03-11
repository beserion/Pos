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
import { ReportsModule } from './reports/reports.module';
import { ReservationsModule } from './reservations/reservations.module';
import { ModifiersModule } from './modifiers/modifiers.module';
import { Role } from './roles/role.entity';
import { Product } from './products/product.entity';
import { Stock } from './stocks/stock.entity';
import { Sale } from './sales/sale.entity';
import { SaleItem } from './sales/sale-item.entity';
import { Invoice } from './invoices/invoice.entity';
import { Delivery } from './deliveries/delivery.entity';
import { Location } from './locations/location.entity';
import { Table } from './tables/table.entity';
import { Employee } from './employees/employee.entity';
import { EmployeeDocument } from './employees/employee-document.entity';
import { Zone } from './zones/zone.entity';
import { Partner } from './partners/partner.entity';
import { Warehouse } from './warehouses/warehouse.entity';
import { AccountTransaction } from './finance/account-transaction.entity';
import { Order } from './orders/order.entity';
import { OrderItem } from './orders/order-item.entity';
import { Printer } from './printers/printer.entity';
import { Recipe } from './recipes/recipe.entity';
import { Wastage } from './wastages/wastage.entity';
import { PurchaseOrder } from './purchase-orders/purchase-order.entity';
import { PurchaseOrderItem } from './purchase-orders/purchase-order-item.entity';
import { Reservation } from './reservations/reservation.entity';
import { Modifier } from './modifiers/modifier.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const instanceName = configService.get<string>('DB_INSTANCE');
        const config: any = {
          type: 'mssql',
          host: configService.get<string>('DB_HOST', 'localhost'),
          username: configService.get<string>('DB_USERNAME', 'sa'),
          password: configService.get<string>(
            'DB_PASSWORD',
            'YourStrong@Passw0rd',
          ),
          database: configService.get<string>('DB_DATABASE', 'AntigravityPOS'),
          entities: [
            User,
            Role,
            Printer,
            Product,
            Recipe,
            Order,
            OrderItem,
            Table,
            Location,
            Zone,
            AccountTransaction,
            Partner,
            PurchaseOrder,
            PurchaseOrderItem,
            Modifier,
            Wastage,
            Stock,
            Sale,
            SaleItem,
            Invoice,
            Delivery,
            Employee,
            EmployeeDocument,
            Reservation,
            Warehouse,
          ],
          synchronize: false, // Migrations managed manually via migrate-remote.js
          options: {
            encrypt: false,
            trustServerCertificate: true,
            ...(instanceName ? { instanceName } : {}),
          },
        };
        console.log('[AppModule] Connecting to DB:', {
          host: config.host,
          database: config.database,
          username: config.username,
          port: config.port,
          instance: instanceName
        });
        // When using a named instance, don't specify port (uses dynamic port via SQL Browser)
        if (!instanceName) {
          config.port = parseInt(
            configService.get<string>('DB_PORT', '1433'),
            10,
          );
        }
        return config;
      },
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
    ReportsModule,
    ReservationsModule,
    ModifiersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
