import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (user && user.passwordClearText === pass) {
            const { passwordHash, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { username: user.email, sub: user.id, role: user.role?.name };
        return {
            access_token: this.jwtService.sign(payload),
            user: user
        };
    }

    async register(data: any) {
        const salt = await bcrypt.genSalt();
        const hash = await bcrypt.hash(data.password, salt);

        return this.usersService.create({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            passwordHash: hash,
            passwordClearText: data.password,
        });
    }
}
