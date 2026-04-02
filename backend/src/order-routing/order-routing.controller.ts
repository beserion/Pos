import { Controller, Get, UseGuards } from '@nestjs/common';
import { OrderRoutingService, RoutingControlEntry } from './order-routing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireFeature } from '../auth/feature.decorator';
import { FeatureGuard } from '../auth/feature.guard';

@Controller('order-routing')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature('kds_system')
export class OrderRoutingController {
  constructor(private readonly service: OrderRoutingService) {}

  /**
   * Kontrol listesi endpoint'i
   * Döküman bölüm 14.5: tüm ürünlerin etkin çıktı profili ve kural kaynağını listeler
   */
  @Get('control-list')
  getControlList(): Promise<RoutingControlEntry[]> {
    return this.service.getRoutingControlList();
  }
}
