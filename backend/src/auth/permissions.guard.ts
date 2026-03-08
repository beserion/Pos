import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || (!user.userId && !user.id)) {
      throw new ForbiddenException('Kullanıcı bilgisi bulunamadı.');
    }

    const userId = user.userId || user.id;

    try {
      const foundUser = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['role'],
      });

      if (!foundUser || !foundUser.role) {
        throw new ForbiddenException('Rol bilgisi bulunamadı.');
      }

      // Admin has full access logically, but if strictly role-based, we can either hardcode 'Admin' bypass or require explicit permissions.
      // Let's assume Admin role bypasses check (or you can give Admin all permissions in data).
      if (foundUser.role.name === 'Admin') {
        return true;
      }

      // Check if user has ALL required permissions for this route OR AT LEAST ONE?
      // Usually it's "at least one" of the listed or exactly the one listed.
      const userPermissions = foundUser.role.permissions || [];
      const hasPermission = requiredPermissions.every((permission) =>
        userPermissions.includes(permission),
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'Bu işlem için gerekli yetkiniz bulunmamaktadır.',
        );
      }

      return true;
    } catch (e) {
      throw new ForbiddenException(
        e.message || 'Yetki kontrolü sırasında hata oluştu.',
      );
    }
  }
}
