import { Employee } from './employee.entity';
export declare class EmployeeDocument {
    id: number;
    employeeId: number;
    employee: Employee;
    documentType: string;
    documentData: string;
    createdAt: Date;
}
