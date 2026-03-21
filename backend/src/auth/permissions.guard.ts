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

      // Admin role bypasses all permission checks (Case-insensitive)
      const roleName = foundUser.role.name?.toUpperCase();
      console.log(`[PERM] Checking user ${foundUser.email} (Role: ${roleName})`);
      if (roleName === 'ADMIN' || roleName === 'ADMINISTRATOR') {
        return true;
      }

      const userPermissions: any = foundUser.role.permissions || [];
      const extra: string[] = foundUser.extraPermissions || [];
      const allUserPerms = [...(Array.isArray(userPermissions) ? userPermissions : (typeof userPermissions === 'string' ? userPermissions.split(',') : [])), ...extra];

      console.log(`[PERM] User calculated perms:`, allUserPerms);

      if (allUserPerms.includes('ALL')) {
        return true;
      }

      // Support both new format (ORDERS:VIEW) and legacy format (VIEW_ORDERS)
      const hasPermission = requiredPermissions.every((required) => {
        // Direct match (new MODULE:ACTION format)
        if (allUserPerms.includes(required)) return true;

        // Legacy format: VIEW_ORDERS → check if ORDERS:VIEW exists
        if (required.includes('_')) {
          const [action, ...moduleParts] = required.split('_');
          const moduleKey = moduleParts.join('_');
          const newFormatKey = `${moduleKey}:${action}`;
          if (allUserPerms.includes(newFormatKey)) return true;
        }

        // New format: ORDERS:VIEW → check if VIEW_ORDERS exists (legacy fallback)
        if (required.includes(':')) {
          const [module, action] = required.split(':');
          const legacyKey = `${action}_${module}`;
          if (allUserPerms.includes(legacyKey)) return true;
        }

        return false;
      });

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
