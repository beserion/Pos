import {
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UsersService } from '../users/users.service';
import { AlertsService } from '../alerts/alerts.service';
import * as bcrypt from 'bcrypt';

/** PIN başarısız giriş sayacı (in-memory, sunucu yeniden başlayınca sıfırlanır) */
const PIN_FAIL_COUNTERS = new Map<string, number>();
const LOGIN_FAIL_COUNTERS = new Map<string, number>();

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private jwtService: JwtService,
    private alertsService: AlertsService,
    @InjectDataSource() private dataSource: DataSource,
  ) { }

  async validateUser(identifier: string, pass: string): Promise<any> {
    // Detect if identifier looks like a phone number (starts with + or digit, no @)
    const isPhone = !identifier.includes('@') && /^[\d\s+\-()]+$/.test(identifier.trim());
    const user = isPhone
      ? await this.usersService.findByPhone(identifier.trim())
      : await this.usersService.findByEmail(identifier.trim());

    if (user && user.passwordHash) {
      const isMatch = await bcrypt.compare(pass, user.passwordHash);
      if (isMatch) {
        LOGIN_FAIL_COUNTERS.delete(identifier.trim().toLowerCase());
        const { passwordHash, passwordClearText, ...result } = user;
        return result;
      }
    }

    // Başarısız giriş sayacını artır
    const key = identifier.trim().toLowerCase();
    const count = (LOGIN_FAIL_COUNTERS.get(key) || 0) + 1;
    LOGIN_FAIL_COUNTERS.set(key, count);

    this.alertsService.trigger('LOGIN_FAIL_LIMIT', {
      description: `"${identifier}" hesabında ${count}. başarısız giriş denemesi.`,
      numericValue: count,
    }).catch(() => {});

    try {
      await this.dataSource.query(`
        INSERT INTO audit_logs (timestamp, actionType, description, companyId)
        VALUES (GETDATE(), 'FAILED_LOGIN', @0, 1)
      `, [`Başarısız giriş denemesi: ${identifier}`]);
    } catch { /* sessiz geç */ }

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
      PIN_FAIL_COUNTERS.delete(`pin:${userId}`);
      return this.login(user);
    }

    // Hatalı PIN sayacı
    const key = `pin:${userId}`;
    const count = (PIN_FAIL_COUNTERS.get(key) || 0) + 1;
    PIN_FAIL_COUNTERS.set(key, count);

    this.alertsService.trigger('PIN_FAIL_LIMIT', {
      triggerUserId: userId,
      description: `Kullanıcı #${userId} için ${count}. defa hatalı PIN girildi.`,
      numericValue: count,
    }).catch(() => {});

    return null;
  }

  async loginWithPinOnly(pinCode: string) {
    const user = await this.usersService.findByPinOnly(pinCode);
    if (user) {
      PIN_FAIL_COUNTERS.delete('pinGlobal');
      return this.login(user);
    }

    // Genel hatalı PIN sayacı (userId bilinmediğinde)
    const key = 'pinGlobal';
    const count = (PIN_FAIL_COUNTERS.get(key) || 0) + 1;
    PIN_FAIL_COUNTERS.set(key, count);

    this.alertsService.trigger('PIN_FAIL_LIMIT', {
      description: `Sistemde ${count}. kez geçersiz ortak PIN denenmeye çalışıldı.`,
      numericValue: count,
    }).catch(() => {});

    try {
      await this.dataSource.query(`
        INSERT INTO audit_logs (timestamp, actionType, description, companyId)
        VALUES (GETDATE(), 'FAILED_LOGIN', @0, 1)
      `, [`Geçersiz ortak PIN denemesi`]);
    } catch { /* sessiz geç */ }

    return null;
  }

  async login(user: any) {
    const payload = {
      username: user.email,
      sub: user.id,
      role: user.role?.name,
      cashRegisterId: user.cashRegisterId || null,
      activeFeatures: user.firm?.activeFeatures || [],
    };

    try {
      await this.dataSource.query(`
        INSERT INTO audit_logs (timestamp, userId, actionType, description, companyId)
        VALUES (GETDATE(), @0, 'USER_LOGIN', @1, @2)
      `, [user.id || 0, `Kullanıcı girişi yapıldı: ${user.firstName} ${user.lastName}`, user.companyId || 1]);
    } catch { /* sessiz geç */ }

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
