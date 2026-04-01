import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { StockCard } from '../stock-cards/stock-card.entity';
import { StockMovement } from '../stock-movements/stock-movement.entity';
import { InventorySession } from '../inventory/inventory-session.entity';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
    @InjectRepository(StockCard)
    private stockCardRepository: Repository<StockCard>,
    @InjectRepository(StockMovement)
    private movementRepository: Repository<StockMovement>,
    @InjectRepository(InventorySession)
    private sessionRepository: Repository<InventorySession>,
  ) {}

  async findAll(): Promise<Warehouse[]> {
    return await this.warehouseRepository.find({ relations: ['location'] });
  }

  async findOne(id: number): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
      relations: ['location'],
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }
    return warehouse;
  }

  async create(warehouseData: Partial<Warehouse>): Promise<Warehouse> {
    const data = { ...warehouseData };
    delete (data as any).id;
    const newWarehouse = this.warehouseRepository.create(data);
    return await this.warehouseRepository.save(newWarehouse);
  }

  async update(id: number, updateData: Partial<Warehouse>): Promise<Warehouse> {
    const warehouse = await this.findOne(id);
    Object.assign(warehouse, updateData);
    return await this.warehouseRepository.save(warehouse);
  }

  async remove(id: number): Promise<void> {
    const warehouse = await this.findOne(id);

    // 1. Stock Card Check
    const cardCount = await this.stockCardRepository.count({
      where: { warehouseId: id },
    });
    if (cardCount > 0) {
      throw new BadRequestException(
        `Bu depoya bağlı ${cardCount} adet stok kartı bulunmaktadır. Önce bunları başka depoya taşıyın veya silin.`,
      );
    }

    // 2. Stock Movement Check
    const movementCount = await this.movementRepository.count({
      where: { warehouseId: id },
    });
    if (movementCount > 0) {
      throw new BadRequestException(
        `Bu depoya ait ${movementCount} adet stok hareketi (geçmiş) bulunmaktadır. Hareket geçmişi olan depo silinemez.`,
      );
    }

    // 3. Inventory Session Check
    const sessionCount = await this.sessionRepository.count({
      where: { warehouseId: id },
    });
    if (sessionCount > 0) {
      throw new BadRequestException(
        `Bu depoya ait ${sessionCount} adet sayım oturumu bulunmaktadır.`,
      );
    }

    await this.warehouseRepository.remove(warehouse);
  }
}
