import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StockMovementsService } from './stock-movements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('stock-movements')
@UseGuards(JwtAuthGuard)
export class StockMovementsController {
  constructor(private readonly service: StockMovementsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('stockCardId') stockCardId?: string,
    @Query('movementType') movementType?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.findAll(
      parseInt(page || '1'),
      parseInt(limit || '20'),
      stockCardId ? parseInt(stockCardId) : undefined,
      movementType,
      warehouseId ? parseInt(warehouseId) : undefined,
      startDate,
      endDate,
    );
  }

  @Get('types')
  getMovementTypes() {
    return this.service.getMovementTypes();
  }

  @Get('by-reference')
  findByReference(
    @Query('referenceType') referenceType: string,
    @Query('referenceId') referenceId: string,
  ) {
    return this.service.findByReference(referenceType, parseInt(referenceId));
  }

  @Post('manual')
  createManualEntry(@Body() body: any) {
    return this.service.createManualEntry(body);
  }

  @Post('transfer')
  createTransfer(@Body() body: any) {
    return this.service.createTransfer(body);
  }
}
