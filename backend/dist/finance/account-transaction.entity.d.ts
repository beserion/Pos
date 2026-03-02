import { User } from '../users/user.entity';
export declare class AccountTransaction {
    id: number;
    amount: number;
    type: string;
    description: string;
    sourceType: string;
    sourceId: number;
    paymentMethod: string;
    category: string;
    user: User;
    createdAt: Date;
    updatedAt: Date;
}
