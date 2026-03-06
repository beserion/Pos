"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StocksService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const stock_entity_1 = require("./stock.entity");
const product_entity_1 = require("../products/product.entity");
let StocksService = class StocksService {
    stockRepository;
    productRepository;
    constructor(stockRepository, productRepository) {
        this.stockRepository = stockRepository;
        this.productRepository = productRepository;
    }
    async findAll() {
        return await this.stockRepository.find({ relations: ['product'] });
    }
    async findOne(id) {
        const stock = await this.stockRepository.findOne({ where: { id }, relations: ['product'] });
        if (!stock) {
            throw new common_1.NotFoundException(`Stock with ID ${id} not found`);
        }
        return stock;
    }
    async create(stockData) {
        const newStock = this.stockRepository.create(stockData);
        return await this.stockRepository.save(newStock);
    }
    async update(id, updateData) {
        await this.findOne(id);
        await this.stockRepository.update(id, updateData);
        return this.findOne(id);
    }
    async remove(id) {
        await this.findOne(id);
        await this.stockRepository.delete(id);
    }
    async deductStock(productId, quantity, location) {
        const where = { product: { id: productId } };
        if (location)
            where.location = location;
        const stocks = await this.stockRepository.find({
            where,
            order: { quantity: 'DESC' },
        });
        if (stocks.length === 0) {
            const newStock = this.stockRepository.create({
                product: { id: productId },
                quantity: -quantity,
                location: location || 'default',
            });
            await this.stockRepository.save(newStock);
            return;
        }
        let remaining = quantity;
        for (const stock of stocks) {
            if (remaining <= 0)
                break;
            const available = Number(stock.quantity);
            const deduct = Math.min(available, remaining);
            stock.quantity = available - deduct;
            remaining -= deduct;
            await this.stockRepository.save(stock);
        }
        if (remaining > 0) {
            stocks[0].quantity = Number(stocks[0].quantity) - remaining;
            await this.stockRepository.save(stocks[0]);
        }
    }
    async addStock(productId, quantity, location) {
        const where = { product: { id: productId } };
        if (location)
            where.location = location;
        const stock = await this.stockRepository.findOne({ where });
        if (stock) {
            stock.quantity = Number(stock.quantity) + quantity;
            await this.stockRepository.save(stock);
        }
        else {
            const newStock = this.stockRepository.create({
                product: { id: productId },
                quantity,
                location: location || 'default',
            });
            await this.stockRepository.save(newStock);
        }
    }
    async checkLowStock() {
        const products = await this.productRepository.find({
            where: { isActive: true },
            relations: ['stocks'],
        });
        const lowStockItems = [];
        for (const product of products) {
            const minLevel = Number(product.minStockLevel || 0);
            if (minLevel <= 0)
                continue;
            const totalStock = (product.stocks || []).reduce((sum, s) => sum + Number(s.quantity), 0);
            if (totalStock < minLevel) {
                lowStockItems.push({
                    productId: product.id,
                    productName: product.name,
                    currentStock: totalStock,
                    minStockLevel: minLevel,
                    costPrice: Number(product.costPrice || 0),
                    unit: product.unit || 'adet',
                });
            }
        }
        return lowStockItems;
    }
};
exports.StocksService = StocksService;
exports.StocksService = StocksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(stock_entity_1.Stock)),
    __param(1, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], StocksService);
//# sourceMappingURL=stocks.service.js.map