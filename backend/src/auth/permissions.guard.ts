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

interface CachedPerms {
  allUserPerms: string[];
  roleName?: string;
  expiresAt: number;
}
const userPermsCache = new Map<number, CachedPerms>();
const CACHE_TTL_MS = 9 * 60 * 60 * 1000; // 9 hours

export function getCachedPerms(userId: number) {
  return userPermsCache.get(userId);
}

export function clearUserPermissionsCache(userId?: number) {
  if (userId) {
    userPermsCache.delete(userId);
  } else {
    userPermsCache.clear();
  }
}

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
      const now = Date.now();
      const cached = userPermsCache.get(userId);
      
      let roleName = cached?.roleName;
      let allUserPerms = cached?.allUserPerms || [];

      if (!cached || cached.expiresAt < now) {
        // Cache miss or expired, fetch from DB
        const foundUser = await this.userRepository.findOne({
          where: { id: userId },
          relations: ['role'],
        });

        if (!foundUser || !foundUser.role) {
          throw new ForbiddenException('Rol bilgisi bulunamadı.');
        }

        roleName = foundUser.role.name?.toUpperCase();

        const userPermissions: any = foundUser.role.permissions || [];
        const extra: string[] = foundUser.extraPermissions || [];
        
        let rolePermsArr: string[] = [];
        if (Array.isArray(userPermissions)) {
          rolePermsArr = userPermissions;
        } else if (typeof userPermissions === 'string') {
          rolePermsArr = userPermissions.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
        
        const extraPermsArr = extra.map((s: string) => s.trim()).filter(Boolean);
        
        const negativePerms = extraPermsArr.filter(p => p.startsWith('!')).map(p => p.slice(1).toUpperCase());
        const positiveExtra = extraPermsArr.filter(p => !p.startsWith('!'));
        
        const filteredRolePerms = rolePermsArr.filter(p => !negativePerms.includes(p.toUpperCase()));
        
        allUserPerms = [...filteredRolePerms, ...positiveExtra];

        userPermsCache.set(userId, {
          allUserPerms,
          roleName,
          expiresAt: now + CACHE_TTL_MS,
        });
      }

      // Admin role bypasses all permission checks (Case-insensitive)
      if (roleName === 'ADMIN' || roleName === 'ADMINISTRATOR') {
        return true;
      }

      if (allUserPerms.includes('ALL')) {
        return true;
      }

      // ANY of the listed permissions is sufficient (OR logic)
      const checkOnePerm = (required: string): boolean => {
        // Direct match
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
      };

      // User must have at least ONE of the required permissions
      const hasPermission = requiredPermissions.some(checkOnePerm);

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
