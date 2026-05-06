import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InposBridgeService } from './inpos-bridge.service';
import { InposService } from './inpos.service';
import { InposController } from './inpos.controller';
import { InposConfig } from './inpos-config.entity';

import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [TypeOrmModule.forFeature([InposConfig]), OrdersModule],
  controllers: [InposController],
  providers: [InposBridgeService, InposService],
  exports: [InposService, InposBridgeService],
})
export class InposModule {}
