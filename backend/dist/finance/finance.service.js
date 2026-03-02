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
exports.FinanceService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const account_transaction_entity_1 = require("./account-transaction.entity");
let FinanceService = class FinanceService {
    transactionRepository;
    constructor(transactionRepository) {
        this.transactionRepository = transactionRepository;
    }
    async findAll() {
        return await this.transactionRepository.find({ relations: ['user'], order: { createdAt: 'DESC' } });
    }
    async findOne(id) {
        const tx = await this.transactionRepository.findOne({ where: { id }, relations: ['user'] });
        if (!tx)
            throw new common_1.NotFoundException(`Transaction with ID ${id} not found`);
        return tx;
    }
    async create(data) {
        const transaction = this.transactionRepository.create(data);
        return await this.transactionRepository.save(transaction);
    }
    async update(id, data) {
        await this.findOne(id);
        await this.transactionRepository.update(id, data);
        return this.findOne(id);
    }
    async remove(id) {
        await this.findOne(id);
        await this.transactionRepository.delete(id);
    }
    async getSummary() {
        const transactions = await this.transactionRepository.find();
        const income = transactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const expense = transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const kasa = transactions.filter(t => t.paymentMethod === 'KASA').reduce((s, t) => s + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)), 0);
        const banka = transactions.filter(t => t.paymentMethod === 'BANKA').reduce((s, t) => s + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)), 0);
        const kart = transactions.filter(t => t.paymentMethod === 'KREDI_KARTI').reduce((s, t) => s + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)), 0);
        return {
            totalIncome: income,
            totalExpense: expense,
            balance: income - expense,
            kasa, banka, kart,
            count: transactions.length
        };
    }
};
exports.FinanceService = FinanceService;
exports.FinanceService = FinanceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(account_transaction_entity_1.AccountTransaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], FinanceService);
//# sourceMappingURL=finance.service.js.map