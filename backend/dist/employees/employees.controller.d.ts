import { EmployeesService } from './employees.service';
import { Employee } from './employee.entity';
export declare class EmployeesController {
    private readonly employeesService;
    constructor(employeesService: EmployeesService);
    findAll(): Promise<Employee[]>;
    findOne(id: string): Promise<Employee>;
    create(employeeData: Partial<Employee>): Promise<Employee>;
    update(id: string, updateData: Partial<Employee>): Promise<Employee>;
    partialUpdate(id: string, updateData: Partial<Employee>): Promise<Employee>;
    remove(id: string): Promise<void>;
    getDocuments(id: string): Promise<import("./employee-document.entity").EmployeeDocument[]>;
    addDocument(id: string, body: {
        documentType: string;
        documentData: string;
    }): Promise<import("./employee-document.entity").EmployeeDocument>;
    removeDocument(id: string, docId: string): Promise<void>;
}
