import {
  Controller,
  Post,
  Body,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Geçersiz e-posta veya şifre');
    }
    return this.authService.login(user);
  }

  @Get('waiters')
  async getWaiters() {
    return this.authService.getWaiters();
  }

  @Get('cashiers')
  async getCashiers() {
    return this.authService.getCashiers();
  }

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

  @Post('login-pin-only')
  async loginPinOnly(@Body() body: any) {
    const result = await this.authService.loginWithPinOnly(body.pinCode);
    if (!result) {
      throw new UnauthorizedException('Hatalı Şifre');
    }
    return result;
  }

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }
}
