import { Controller, Get } from '@nestjs/common';
import { OrderRoutingService, RoutingControlEntry } from './order-routing.service';
import { Permissions } from '../auth/permissions.decorator';

@Controller('order-routing')
@Permissions('PRINTERS:VIEW')
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
