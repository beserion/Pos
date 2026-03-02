import { User } from '../users/user.entity';
export declare class Role {
    id: number;
    name: string;
    description: string;
    permissions: string[];
    users: User[];
    createdAt: Date;
    updatedAt: Date;
}
