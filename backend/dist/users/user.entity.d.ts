import { Role } from '../roles/role.entity';
export declare class User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    passwordClearText: string;
    pinCode: string;
    isActive: boolean;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
}
