import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermModule } from './permission-module.entity';
import { PermissionModulesService } from './permission-modules.service';
import { PermissionModulesController } from './permission-modules.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PermModule])],
  controllers: [PermissionModulesController],
  providers: [PermissionModulesService],
  exports: [PermissionModulesService],
})
export class PermissionModulesModule {}
