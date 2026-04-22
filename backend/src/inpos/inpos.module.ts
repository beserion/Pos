import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InposBridgeService } from './inpos-bridge.service';
import { InposService } from './inpos.service';
import { InposController } from './inpos.controller';
import { InposConfig } from './inpos-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InposConfig])],
  controllers: [InposController],
  providers: [InposBridgeService, InposService],
  exports: [InposService, InposBridgeService],
})
export class InposModule {}
