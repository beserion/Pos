import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
export declare class AuthService {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(email: string, pass: string): Promise<any>;
    getWaiters(): Promise<Partial<import("../users/user.entity").User>[]>;
    loginWithPin(userId: number, pinCode: string): Promise<{
        access_token: string;
        user: any;
    } | null>;
    login(user: any): Promise<{
        access_token: string;
        user: any;
    }>;
    register(data: any): Promise<import("../users/user.entity").User>;
}
