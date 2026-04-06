import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemLicense } from './license.entity';
import { LicenseService } from './license.service';
import { LicenseController } from './license.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SystemLicense])],
  controllers: [LicenseController],
  providers: [LicenseService],
  exports: [LicenseService],
})
export class LicenseModule {}
