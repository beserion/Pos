"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StocksModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const stocks_service_1 = require("./stocks.service");
const stocks_controller_1 = require("./stocks.controller");
const stock_entity_1 = require("./stock.entity");
const product_entity_1 = require("../products/product.entity");
const security_module_1 = require("../auth/security.module");
let StocksModule = class StocksModule {
};
exports.StocksModule = StocksModule;
exports.StocksModule = StocksModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([stock_entity_1.Stock, product_entity_1.Product]),
            security_module_1.SecurityModule,
        ],
        providers: [stocks_service_1.StocksService],
        controllers: [stocks_controller_1.StocksController],
        exports: [stocks_service_1.StocksService],
    })
], StocksModule);
//# sourceMappingURL=stocks.module.js.map