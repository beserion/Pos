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
import { LicenseModule } from './license/license.module';
import { SystemLicense } from './license/license.entity';
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
import { ParametersModule } from './parameters/parameters.module';
import { Role } from './roles/role.entity';
import { Product } from './products/product.entity';
import { Stock } from './stocks/stock.entity';
import { Sale } from './sales/sale.entity';
import { SaleItem } from './sales/sale-item.entity';
import { TransferLog } from './sales/transfer-log.entity';
import { Invoice } from './invoices/invoice.entity';
import { InvoiceItem } from './invoices/invoice-item.entity';
import { Delivery } from './deliveries/delivery.entity';
import { Location } from './locations/location.entity';
import { Table } from './tables/table.entity';
import { Employee } from './employees/employee.entity';
import { EmployeeDocument } from './employees/employee-document.entity';
import { Zone } from './zones/zone.entity';
import { Partner } from './partners/partner.entity';
import { Warehouse } from './warehouses/warehouse.entity';
import { AccountTransaction } from './finance/account-transaction.entity';
import { CompanyAccount } from './finance/company-account.entity';
import { Order } from './orders/order.entity';
import { OrderItem } from './orders/order-item.entity';
import { Printer } from './printers/printer.entity';
import { Recipe } from './recipes/recipe.entity';
import { Wastage } from './wastages/wastage.entity';
import { PurchaseOrder } from './purchase-orders/purchase-order.entity';
import { PurchaseOrderItem } from './purchase-orders/purchase-order-item.entity';
import { Reservation } from './reservations/reservation.entity';
import { Modifier } from './modifiers/modifier.entity';
import { Parameter } from './parameters/parameter.entity';
import { PermissionModulesModule } from './permission-modules/permission-modules.module';
import { PermModule } from './permission-modules/permission-module.entity';
import { AlertsModule } from './alerts/alerts.module';
import { AlertRule } from './alerts/alert-rule.entity';
import { AlertNotification } from './alerts/alert-notification.entity';
import { CashRegistersModule } from './cash-registers/cash-registers.module';
import { CashRegister } from './cash-registers/cash-register.entity';
import { DepartmentsModule } from './departments/departments.module';
import { Department } from './departments/department.entity';
import { ShiftsModule } from './shifts/shifts.module';
import { Shift } from './shifts/shift.entity';
import { ZReport } from './reports/z-report.entity';
import { AuditLog } from './reports/audit-log.entity';
import { BusinessDayLog } from './reports/business-day-log.entity';
import { ClosedDayRecord } from './reports/closed-day-record.entity';
import { ProductType } from './product-types/product-type.entity';
import { OutputProfile } from './output-profiles/output-profile.entity';
import { SetMenu } from './products/set-menu.entity';
import { SetGroup } from './products/set-group.entity';
import { SetGroupItem } from './products/set-group-item.entity';
import { ProductTypesModule } from './product-types/product-types.module';
import { OutputProfilesModule } from './output-profiles/output-profiles.module';
import { OrderRoutingModule } from './order-routing/order-routing.module';
import { StockCardsModule } from './stock-cards/stock-cards.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { InventoryModule } from './inventory/inventory.module';

import { StockCard } from './stock-cards/stock-card.entity';
import { UnitConversion } from './stock-cards/unit-conversion.entity';
import { RecipeHeader } from './recipes/recipe-header.entity';
import { RecipeLine } from './recipes/recipe-line.entity';
import { StockMovement } from './stock-movements/stock-movement.entity';
import { InventorySession } from './inventory/inventory-session.entity';
import { InventorySessionLine } from './inventory/inventory-session-line.entity';
import { ProductTransaction } from './sales/product-transaction.entity';
import { ProductVariation } from './products/product-variation.entity';
import { VariationGroup } from './products/variation-group.entity';
import { StockGroup } from './stock-groups/stock-group.entity';
import { StockGroupsModule } from './stock-groups/stock-groups.module';
import { Firm } from './firms/firm.entity';
import { FirmsModule } from './firms/firms.module';
import { ParentGroup } from './parent-groups/parent-group.entity';
import { ParentGroupsModule } from './parent-groups/parent-groups.module';

import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
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
            CompanyAccount,
            Partner,
            PurchaseOrder,
            PurchaseOrderItem,
            Modifier,
            Wastage,
            Stock,
            Sale,
            SaleItem,
            Invoice,
            InvoiceItem,
            Delivery,
            Employee,
            EmployeeDocument,
            Reservation,
            Warehouse,
            Parameter,
            PermModule,
            AlertRule,
            AlertNotification,
            CashRegister,
            Department,
            Shift,
            ZReport,
            AuditLog,
            BusinessDayLog,
            ClosedDayRecord,
            ProductType,
            OutputProfile,
            TransferLog,
            SetMenu,
            SetGroup,
            SetGroupItem,
            StockCard,
            UnitConversion,
            RecipeHeader,
            RecipeLine,
            StockMovement,
            InventorySession,
            InventorySessionLine,
            ProductTransaction,
            ProductVariation,
            VariationGroup,
            StockGroup,
            Firm,
            ParentGroup,
            SystemLicense,
          ],
          synchronize: true, // Auto-sync enabled by user permission
          logging: true,
          options: {
            encrypt: true,
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
    ParametersModule,
    PermissionModulesModule,
    AlertsModule,
    CashRegistersModule,
    DepartmentsModule,
    ShiftsModule,
    ProductTypesModule,
    OutputProfilesModule,
    OrderRoutingModule,
    StockCardsModule,
    StockMovementsModule,
    InventoryModule,
    StockGroupsModule,
    FirmsModule,
    ParentGroupsModule,
    LicenseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
