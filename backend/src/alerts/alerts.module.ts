import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertRule } from './alert-rule.entity';
import { AlertNotification } from './alert-notification.entity';
import { AlertsService } from './alerts.service';
import { AlertsGateway } from './alerts.gateway';
import { AlertsController } from './alerts.controller';
import { PushSubscriptionEntity } from '../users/push-subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AlertRule, AlertNotification, PushSubscriptionEntity])],
  providers: [AlertsService, AlertsGateway],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}
