import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './employee.entity';
import { EmployeeDocument } from './employee-document.entity';

@Injectable()
export class EmployeesService {
    constructor(
        @InjectRepository(Employee)
        private employeeRepository: Repository<Employee>,
        @InjectRepository(EmployeeDocument)
        private employeeDocumentRepository: Repository<EmployeeDocument>,
    ) { }

    async findAll(): Promise<Employee[]> {
        return await this.employeeRepository.find({ relations: ['location', 'userAccount'] });
    }

    async findOne(id: number): Promise<Employee> {
        const employee = await this.employeeRepository.findOne({ where: { id }, relations: ['location', 'userAccount'] });
        if (!employee) {
            throw new NotFoundException(`Employee with ID ${id} not found`);
        }
        return employee;
    }

    async create(employeeData: Partial<Employee>): Promise<Employee> {
        const newEmployee = this.employeeRepository.create(employeeData);
        return await this.employeeRepository.save(newEmployee);
    }

    async update(id: number, updateData: Partial<Employee>): Promise<Employee> {
        await this.findOne(id); // Check existence
        await this.employeeRepository.update(id, updateData);
        return this.findOne(id);
    }

    async remove(id: number): Promise<void> {
        await this.findOne(id);
        await this.employeeRepository.delete(id);
    }

    // Document Management
    async getDocuments(employeeId: number): Promise<EmployeeDocument[]> {
        await this.findOne(employeeId); // check if employee exists
        return await this.employeeDocumentRepository.find({
            where: { employeeId },
            order: { createdAt: 'DESC' }
        });
    }

    async addDocument(employeeId: number, documentType: string, documentData: string): Promise<EmployeeDocument> {
        await this.findOne(employeeId); // check if employee exists
        const newDoc = this.employeeDocumentRepository.create({
            employeeId,
            documentType,
            documentData
        });
        return await this.employeeDocumentRepository.save(newDoc);
    }

    async removeDocument(employeeId: number, documentId: number): Promise<void> {
        await this.findOne(employeeId); // check if employee exists
        const doc = await this.employeeDocumentRepository.findOne({ where: { id: documentId, employeeId } });
        if (!doc) {
            throw new NotFoundException(`Document with ID ${documentId} not found for this employee.`);
        }
        await this.employeeDocumentRepository.delete(documentId);
    }
}
