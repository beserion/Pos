import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutputProfile } from './output-profile.entity';
import { OutputProfilesService } from './output-profiles.service';
import { OutputProfilesController } from './output-profiles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OutputProfile])],
  controllers: [OutputProfilesController],
  providers: [OutputProfilesService],
  exports: [OutputProfilesService],
})
export class OutputProfilesModule {}
