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
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Firm } from '../firms/firm.entity';
import { User } from '../users/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    @InjectDataSource() private dataSource: DataSource,
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

  @Public()
  @Get('setup-test-license')
  async setupTestLicense() {
    let firmRepository = this.dataSource.getRepository(Firm);
    let userRepository = this.dataSource.getRepository(User);

    let firm = await firmRepository.findOne({ where: { name: 'Demo Lisans Firması' } });
    if (!firm) {
      firm = firmRepository.create({
        name: 'Demo Lisans Firması',
        isActive: true,
        activeFeatures: ['waiter_app', 'delivery_system', 'kds'], 
      });
      await firmRepository.save(firm);
    } else {
      firm.activeFeatures = ['waiter_app', 'delivery_system', 'kds'];
      await firmRepository.save(firm);
    }

    const users = await userRepository.find();
    for (const u of users) {
      u.firm = firm;
      await userRepository.save(u);
    }

    return { success: true, message: `Demo firma oluşturuldu ve ${users.length} kullanıcıya atandı.` };
  }
}

