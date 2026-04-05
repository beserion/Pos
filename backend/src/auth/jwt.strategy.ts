import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'super-secret-key-replace-me',
      ),
    });
  }

  async validate(payload: any) {
    // Fetch latest user data from DB to ensure real-time permission/license checks
    const user = await this.usersService.findOne(payload.sub);
    return {
      userId: user.id,
      username: user.email,
      role: user.role?.name,
      cashRegisterId: user.cashRegisterId || null,
      firm: user.firm, // Now contains activeFeatures from DB
      activeFeatures: user.firm?.activeFeatures || [], // Backward compatibility
    };
  }
}
