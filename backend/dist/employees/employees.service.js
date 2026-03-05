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
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const employee_entity_1 = require("./employee.entity");
const employee_document_entity_1 = require("./employee-document.entity");
let EmployeesService = class EmployeesService {
    employeeRepository;
    employeeDocumentRepository;
    constructor(employeeRepository, employeeDocumentRepository) {
        this.employeeRepository = employeeRepository;
        this.employeeDocumentRepository = employeeDocumentRepository;
    }
    async findAll() {
        return await this.employeeRepository.find({ relations: ['location', 'userAccount'] });
    }
    async findOne(id) {
        const employee = await this.employeeRepository.findOne({ where: { id }, relations: ['location', 'userAccount'] });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee with ID ${id} not found`);
        }
        return employee;
    }
    async create(employeeData) {
        const newEmployee = this.employeeRepository.create(employeeData);
        return await this.employeeRepository.save(newEmployee);
    }
    async update(id, updateData) {
        const employee = await this.findOne(id);
        const { id: _, ...data } = updateData;
        this.employeeRepository.merge(employee, data);
        return await this.employeeRepository.save(employee);
    }
    async remove(id) {
        await this.findOne(id);
        await this.employeeRepository.delete(id);
    }
    async getDocuments(employeeId) {
        await this.findOne(employeeId);
        return await this.employeeDocumentRepository.find({
            where: { employeeId },
            order: { createdAt: 'DESC' }
        });
    }
    async addDocument(employeeId, documentType, documentData) {
        await this.findOne(employeeId);
        const newDoc = this.employeeDocumentRepository.create({
            employeeId,
            documentType,
            documentData
        });
        return await this.employeeDocumentRepository.save(newDoc);
    }
    async removeDocument(employeeId, documentId) {
        await this.findOne(employeeId);
        const doc = await this.employeeDocumentRepository.findOne({ where: { id: documentId, employeeId } });
        if (!doc) {
            throw new common_1.NotFoundException(`Document with ID ${documentId} not found for this employee.`);
        }
        await this.employeeDocumentRepository.delete(documentId);
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(employee_entity_1.Employee)),
    __param(1, (0, typeorm_1.InjectRepository)(employee_document_entity_1.EmployeeDocument)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map