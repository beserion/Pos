import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_FEATURE_KEY } from './feature.decorator';
import { LicenseService } from '../license/license.service';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private licenseService: LicenseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) {
      return true; // No feature required, proceed
    }

    const { user } = context.switchToHttp().getRequest();
    
    // 1. Check static features in DB (fallback/static assignment)
    const staticFeatures = user?.firm?.activeFeatures || user?.activeFeatures || [];
    if (staticFeatures.includes(requiredFeature)) {
      return true;
    }

    // 2. Check dynamic features from current License
    const licenseStatus = await this.licenseService.checkLicenseStatus();
    const dynamicModules = licenseStatus.modules || [];
    
    if (dynamicModules.includes(requiredFeature) || dynamicModules.includes('ALL')) {
      return true;
    }

    throw new ForbiddenException(`Access denied. Your license does not cover the feature: ${requiredFeature}`);
  }
}
