import {
  Controller,
  Post,
  Body,
  Get,
  UnauthorizedException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) { }

  @Get('me')
  async me(@Request() req: any) {
    const userId = req.user.userId;
    return this.usersService.findOne(userId);
  }

  @Public()
  @Post('login')
  async login(@Body() body: any) {
    const identifier = body.identifier || body.email;
    const user = await this.authService.validateUser(identifier, body.password);
    if (!user) {
      throw new UnauthorizedException('Geçersiz e-posta/telefon veya şifre');
    }
    return this.authService.login(user);
  }

  @Public()
  @Get('waiters')
  async getWaiters() {
    return this.authService.getWaiters();
  }

  @Public()
  @Get('cashiers')
  async getCashiers() {
    return this.authService.getCashiers();
  }

  @Public()
  @Post('login-pin')
  async loginPin(@Body() body: any) {
    const result = await this.authService.loginWithPin(
      body.userId,
      body.pinCode,
    );
    if (!result) {
      throw new UnauthorizedException('Hatalı Şifre');
    }
    return result;
  }

  @Public()
  @Post('login-pin-only')
  async loginPinOnly(@Body() body: any) {
    const result = await this.authService.loginWithPinOnly(body.pinCode);
    if (!result) {
      throw new UnauthorizedException('Hatalı Şifre');
    }
    return result;
  }

  @Public()
  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }
}
