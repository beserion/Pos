import {
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && user.passwordHash) {
      const isMatch = await bcrypt.compare(pass, user.passwordHash);
      if (isMatch) {
        const { passwordHash, passwordClearText, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async getWaiters() {
    return this.usersService.findWaiters();
  }

  async getCashiers() {
    return this.usersService.findCashiers();
  }

  async loginWithPin(userId: number, pinCode: string) {
    const user = await this.usersService.findByPin(userId, pinCode);
    if (user) {
      return this.login(user); // returns token and user data
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      username: user.email,
      sub: user.id,
      role: user.role?.name,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: user,
    };
  }

  async register(data: any) {
    return this.usersService.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash: data.password, // UsersService will hash it
      passwordClearText: data.password,
    });
  }
}
