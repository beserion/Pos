import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { Delivery } from './delivery.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireFeature } from '../auth/feature.decorator';
import { FeatureGuard } from '../auth/feature.guard';

@Controller('deliveries')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature('delivery_system')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  findAll() {
    return this.deliveriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliveriesService.findOne(+id);
  }

  @Get('courier/:id')
  findByCourier(@Param('id') id: string) {
    return this.deliveriesService.findByCourier(+id);
  }

  @Get('courier/:id/history')
  findHistoryByCourier(@Param('id') id: string) {
    return this.deliveriesService.findHistoryByCourier(+id);
  }

  @Put(':id/location')
  updateLocation(
    @Param('id') id: string,
    @Body() coords: { lat: number; lng: number },
  ) {
    return this.deliveriesService.updateLocation(+id, coords.lat, coords.lng);
  }

  @Post()
  create(@Body() deliveryData: Partial<Delivery>) {
    return this.deliveriesService.create(deliveryData);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateData: Partial<Delivery>) {
    return this.deliveriesService.update(+id, updateData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deliveriesService.remove(+id);
  }
}
