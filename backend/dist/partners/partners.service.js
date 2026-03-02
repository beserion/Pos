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
exports.PartnersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const partner_entity_1 = require("./partner.entity");
let PartnersService = class PartnersService {
    partnerRepository;
    constructor(partnerRepository) {
        this.partnerRepository = partnerRepository;
    }
    async findAll(type) {
        if (type) {
            return await this.partnerRepository.find({ where: { type } });
        }
        return await this.partnerRepository.find();
    }
    async findOne(id) {
        const partner = await this.partnerRepository.findOne({ where: { id } });
        if (!partner) {
            throw new common_1.NotFoundException(`Partner with ID ${id} not found`);
        }
        return partner;
    }
    async create(partnerData) {
        const newPartner = this.partnerRepository.create(partnerData);
        return await this.partnerRepository.save(newPartner);
    }
    async update(id, updateData) {
        await this.findOne(id);
        await this.partnerRepository.update(id, updateData);
        return this.findOne(id);
    }
    async remove(id) {
        await this.findOne(id);
        await this.partnerRepository.delete(id);
    }
};
exports.PartnersService = PartnersService;
exports.PartnersService = PartnersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(partner_entity_1.Partner)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PartnersService);
//# sourceMappingURL=partners.service.js.map