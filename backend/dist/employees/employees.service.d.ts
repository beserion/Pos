import { Repository } from 'typeorm';
import { Employee } from './employee.entity';
import { EmployeeDocument } from './employee-document.entity';
export declare class EmployeesService {
    private employeeRepository;
    private employeeDocumentRepository;
    constructor(employeeRepository: Repository<Employee>, employeeDocumentRepository: Repository<EmployeeDocument>);
    findAll(): Promise<Employee[]>;
    findOne(id: number): Promise<Employee>;
    create(employeeData: Partial<Employee>): Promise<Employee>;
    update(id: number, updateData: Partial<Employee>): Promise<Employee>;
    remove(id: number): Promise<void>;
    getDocuments(employeeId: number): Promise<EmployeeDocument[]>;
    addDocument(employeeId: number, documentType: string, documentData: string): Promise<EmployeeDocument>;
    removeDocument(employeeId: number, documentId: number): Promise<void>;
}
