import { Location } from '../locations/location.entity';
import { User } from '../users/user.entity';
import { EmployeeDocument } from './employee-document.entity';
export declare class Employee {
    id: number;
    firstName: string;
    lastName: string;
    roleTitle: string;
    phone: string;
    location: Location;
    userAccount: User;
    isActive: boolean;
    vehicleType: string;
    licensePlate: string;
    courierStatus: string;
    photo: string;
    document: string;
    documents: EmployeeDocument[];
    createdAt: Date;
    updatedAt: Date;
}
