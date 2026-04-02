import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_FEATURE_KEY } from './feature.decorator';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeature = this.reflector.getAllAndOverride<string>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) {
      return true; // No feature required, proceed
    }

    const { user } = context.switchToHttp().getRequest();
    // activeFeatures are embedded in the JWT token payload inside AuthService.login
    if (!user || !user.activeFeatures) {
      throw new ForbiddenException(`Access denied. License missing for feature: ${requiredFeature}`);
    }

    if (!user.activeFeatures.includes(requiredFeature)) {
      throw new ForbiddenException(`Access denied. Your license does not cover the feature: ${requiredFeature}`);
    }

    return true;
  }
}
