"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const roles_module_1 = require("./roles/roles.module");
const users_module_1 = require("./users/users.module");
const products_module_1 = require("./products/products.module");
const stocks_module_1 = require("./stocks/stocks.module");
const sales_module_1 = require("./sales/sales.module");
const invoices_module_1 = require("./invoices/invoices.module");
const deliveries_module_1 = require("./deliveries/deliveries.module");
const auth_module_1 = require("./auth/auth.module");
const locations_module_1 = require("./locations/locations.module");
const tables_module_1 = require("./tables/tables.module");
const employees_module_1 = require("./employees/employees.module");
const zones_module_1 = require("./zones/zones.module");
const partners_module_1 = require("./partners/partners.module");
const warehouses_module_1 = require("./warehouses/warehouses.module");
const finance_module_1 = require("./finance/finance.module");
const orders_module_1 = require("./orders/orders.module");
const security_module_1 = require("./auth/security.module");
const printers_module_1 = require("./printers/printers.module");
const recipes_module_1 = require("./recipes/recipes.module");
const wastages_module_1 = require("./wastages/wastages.module");
const purchase_orders_module_1 = require("./purchase-orders/purchase-orders.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'mssql',
                    host: configService.get('DB_HOST', 'localhost'),
                    port: parseInt(configService.get('DB_PORT', '1433'), 10),
                    username: configService.get('DB_USERNAME', 'sa'),
                    password: configService.get('DB_PASSWORD', 'YourStrong@Passw0rd'),
                    database: configService.get('DB_DATABASE', 'AntigravityPOS'),
                    autoLoadEntities: true,
                    synchronize: true,
                    options: {
                        encrypt: false,
                        trustServerCertificate: true,
                    },
                }),
            }),
            roles_module_1.RolesModule,
            users_module_1.UsersModule,
            products_module_1.ProductsModule,
            stocks_module_1.StocksModule,
            sales_module_1.SalesModule,
            invoices_module_1.InvoicesModule,
            deliveries_module_1.DeliveriesModule,
            auth_module_1.AuthModule,
            locations_module_1.LocationsModule,
            tables_module_1.TablesModule,
            employees_module_1.EmployeesModule,
            zones_module_1.ZonesModule,
            partners_module_1.PartnersModule,
            warehouses_module_1.WarehousesModule,
            finance_module_1.FinanceModule,
            orders_module_1.OrdersModule,
            security_module_1.SecurityModule,
            printers_module_1.PrintersModule,
            recipes_module_1.RecipesModule,
            wastages_module_1.WastagesModule,
            purchase_orders_module_1.PurchaseOrdersModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map