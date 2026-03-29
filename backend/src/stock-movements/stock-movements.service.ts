import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StockMovement } from './stock-movement.entity';
import { StockCardsService } from '../stock-cards/stock-cards.service';
import { RecipesService } from '../recipes/recipes.service';
import { ParametersService } from '../parameters/parameters.service';
import { Product } from '../products/product.entity';

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement)
    private movementRepository: Repository<StockMovement>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private stockCardsService: StockCardsService,
    @Inject(forwardRef(() => RecipesService))
    private recipesService: RecipesService,
    private parametersService: ParametersService,
  ) {}

  // ─── Core Movement Creation ──────────────────────────

  async createMovement(data: {
    stockCardId: number;
    movementType: string;
    quantity: number;
    unit?: string;
    unitCost?: number;
    warehouseId?: number;
    referenceType?: string;
    referenceId?: number;
    sourceType?: string;
    sourceId?: number;
    description?: string;
    note?: string;
    userId?: number;
    businessDate?: Date;
    documentType?: string;
    documentNo?: string;
    reasonCode?: string;
  }, manager?: any): Promise<StockMovement> {
    const repo = manager ? manager.getRepository(StockMovement) : this.movementRepository;

    const card = await this.stockCardsService.findOne(data.stockCardId);
    const unitCost = data.unitCost ?? Number(card.costPerBaseUnit);
    const totalCost = Math.abs(data.quantity) * unitCost;

    // §15: qtyBefore
    const qtyBefore = Number(card.currentStock);

    // Update the stock card's currentStock
    const newStockLevel = await this.stockCardsService.adjustStock(
      data.stockCardId,
      data.quantity,
      manager,
    );

    // §15: qtyIn / qtyOut hesaplama
    const qtyIn = data.quantity > 0 ? Math.abs(data.quantity) : 0;
    const qtyOut = data.quantity < 0 ? Math.abs(data.quantity) : 0;

    const movement = repo.create({
      stockCardId: data.stockCardId,
      movementType: data.movementType,
      quantity: data.quantity,
      qtyIn,
      qtyOut,
      qtyBefore,
      stockAfter: newStockLevel,
      unit: data.unit || card.baseUnit,
      unitCost,
      totalCost,
      warehouseId: data.warehouseId || card.warehouseId,
      // Kaynak izleme: yeni alan + geriye uyumluluk
      sourceType: data.sourceType || data.referenceType,
      sourceId: data.sourceId || data.referenceId,
      referenceType: data.referenceType || data.sourceType,
      referenceId: data.referenceId || data.sourceId,
      // Belge
      documentType: data.documentType,
      documentNo: data.documentNo,
      businessDate: data.businessDate,
      // Not/açıklama
      note: data.note || data.description,
      description: data.description || data.note,
      reasonCode: data.reasonCode,
      userId: data.userId,
    });

    return repo.save(movement);
  }

  // ─── Recipe-based Consumption ────────────────────────

  /**
   * Consume stock based on a product's recipe when a sale is completed.
   * Creates RECIPE_CONSUME movements for each recipe line.
   */
  async createRecipeConsumption(
    productId: number,
    saleQuantity: number,
    saleTypeMultiplier: number = 1,
    referenceType: string = 'SALE',
    referenceId?: number,
    userId?: number,
    manager?: any,
  ): Promise<StockMovement[]> {
    const recipe = await this.recipesService.findActiveByProduct(productId);
    if (!recipe || !recipe.lines || recipe.lines.length === 0) {
      return []; // No recipe for this product
    }

    const movements: StockMovement[] = [];
    for (const line of recipe.lines) {
      const consumeQty = Number(line.quantity) * saleQuantity * saleTypeMultiplier;
      if (consumeQty <= 0) continue;

      const movement = await this.createMovement({
        stockCardId: line.stockCardId,
        movementType: 'RECIPE_CONSUME',
        quantity: -consumeQty, // Negative = stock out
        unit: line.unit,
        referenceType,
        referenceId,
        description: `Satış tüketimi: ${recipe.product?.name || `Ürün #${productId}`}`,
        userId,
      }, manager);

      movements.push(movement);
    }

    return movements;
  }

  /**
   * Reverse recipe consumption (for cancellations/refunds).
   * Creates RECIPE_REVERSE movements.
   */
  async createReverseConsumption(
    productId: number,
    saleQuantity: number,
    saleTypeMultiplier: number = 1,
    referenceType: string = 'SALE',
    referenceId?: number,
    userId?: number,
    manager?: any,
  ): Promise<StockMovement[]> {
    // Check parameter
    const restoreParam = await this.parametersService.getValue(
      'inventory',
      'stock_restore_on_cancel',
    );
    if (restoreParam === 'false') return [];

    const recipe = await this.recipesService.findActiveByProduct(productId);
    if (!recipe || !recipe.lines || recipe.lines.length === 0) {
      return [];
    }

    const movements: StockMovement[] = [];
    for (const line of recipe.lines) {
      const restoreQty = Number(line.quantity) * saleQuantity * saleTypeMultiplier;
      if (restoreQty <= 0) continue;

      const movement = await this.createMovement({
        stockCardId: line.stockCardId,
        movementType: 'RECIPE_REVERSE',
        quantity: restoreQty, // Positive = stock in
        unit: line.unit,
        referenceType,
        referenceId,
        description: `İptal/İade geri yükleme: ${recipe.product?.name || `Ürün #${productId}`}`,
        userId,
      }, manager);

      movements.push(movement);
    }

    return movements;
  }

  // ─── Direct Stock Consumption (§12.2) ────────────────

  /**
   * Direct stock ürün satışında bağlı stoktan doğrudan düşüm.
   * §12.2: Ürün adisyona eklenir → bağlı stoktan doğrudan düşüm yapılır.
   */
  async createDirectStockConsumption(
    productId: number,
    saleQuantity: number,
    saleTypeMultiplier: number = 1,
    referenceType: string = 'SALE',
    referenceId?: number,
    userId?: number,
    manager?: any,
  ): Promise<StockMovement | null> {
    const product = await this.productRepository.findOne({ where: { id: productId } });

    if (!product || product.inventoryLinkType !== 'direct_stock' || !product.linkedStockCardId) {
      return null;
    }

    const consumeQty = Number(product.directStockQty || 1) * saleQuantity * saleTypeMultiplier;
    if (consumeQty <= 0) return null;

    return this.createMovement({
      stockCardId: product.linkedStockCardId,
      movementType: 'DIRECT_SALE_CONSUMPTION',
      quantity: -consumeQty,
      unit: product.directStockUnit || 'adet',
      referenceType,
      referenceId,
      sourceType: 'SALE',
      sourceId: referenceId,
      description: `Direkt satış düşümü: ${product.name}`,
      userId,
    }, manager);
  }

  /**
   * Reverse direct stock consumption (for cancellations/refunds).
   */
  async createDirectStockReverse(
    productId: number,
    saleQuantity: number,
    saleTypeMultiplier: number = 1,
    referenceType: string = 'SALE',
    referenceId?: number,
    userId?: number,
    manager?: any,
  ): Promise<StockMovement | null> {
    const restoreParam = await this.parametersService.getValue('inventory', 'stock_restore_on_cancel');
    if (restoreParam === 'false') return null;

    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product || product.inventoryLinkType !== 'direct_stock' || !product.linkedStockCardId) {
      return null;
    }

    const restoreQty = Number(product.directStockQty || 1) * saleQuantity * saleTypeMultiplier;
    if (restoreQty <= 0) return null;

    return this.createMovement({
      stockCardId: product.linkedStockCardId,
      movementType: 'DIRECT_SALE_REVERSE',
      quantity: restoreQty, // Positive = stock in
      unit: product.directStockUnit || 'adet',
      referenceType,
      referenceId,
      sourceType: 'SALE',
      sourceId: referenceId,
      description: `Direkt satış iade: ${product.name}`,
      userId,
    }, manager);
  }

  // ─── Manual & Transfer ───────────────────────────────

  async createManualEntry(data: {
    stockCardId: number;
    movementType: 'MANUAL_IN' | 'MANUAL_OUT' | 'WASTAGE' | 'STAFF_CONSUME' | 'COMPLIMENTARY' | 'SPOILAGE';
    quantity: number;
    unit?: string;
    warehouseId?: number;
    description?: string;
    reasonCode?: string;
    userId?: number;
  }): Promise<StockMovement> {
    const qty = ['MANUAL_OUT', 'WASTAGE', 'SPOILAGE', 'STAFF_CONSUME', 'COMPLIMENTARY'].includes(data.movementType)
      ? -Math.abs(data.quantity)
      : Math.abs(data.quantity);

    return this.createMovement({
      ...data,
      quantity: qty,
      referenceType: 'MANUAL',
      sourceType: 'MANUAL',
    });
  }

  async createTransfer(data: {
    stockCardId: number;
    quantity: number;
    fromWarehouseId: number;
    toWarehouseId: number;
    description?: string;
    userId?: number;
  }): Promise<{ out: StockMovement; in: StockMovement }> {
    const qty = Math.abs(data.quantity);

    const out = await this.createMovement({
      stockCardId: data.stockCardId,
      movementType: 'TRANSFER_OUT',
      quantity: -qty,
      warehouseId: data.fromWarehouseId,
      referenceType: 'TRANSFER',
      description: data.description || 'Depolar arası transfer',
      userId: data.userId,
    });

    const inMovement = await this.createMovement({
      stockCardId: data.stockCardId,
      movementType: 'TRANSFER_IN',
      quantity: qty,
      warehouseId: data.toWarehouseId,
      referenceType: 'TRANSFER',
      referenceId: out.id,
      description: data.description || 'Depolar arası transfer',
      userId: data.userId,
    });

    return { out, in: inMovement };
  }

  // ─── Queries ─────────────────────────────────────────

  async findAll(
    page: number = 1,
    limit: number = 20,
    stockCardId?: number,
    movementType?: string,
    warehouseId?: number,
    startDate?: string,
    endDate?: string,
  ): Promise<{ data: StockMovement[]; total: number; lastPage: number }> {
    const query = this.movementRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.stockCard', 'stockCard')
      .leftJoinAndSelect('m.warehouse', 'warehouse');

    if (stockCardId) {
      query.andWhere('m.stockCardId = :stockCardId', { stockCardId });
    }
    if (movementType) {
      query.andWhere('m.movementType = :movementType', { movementType });
    }
    if (warehouseId) {
      query.andWhere('m.warehouseId = :warehouseId', { warehouseId });
    }
    if (startDate) {
      query.andWhere('m.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.andWhere('m.createdAt <= :endDate', { endDate: end });
    }

    query.orderBy('m.createdAt', 'DESC');

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, lastPage: Math.ceil(total / limit) };
  }

  async findByReference(referenceType: string, referenceId: number): Promise<StockMovement[]> {
    return this.movementRepository.find({
      where: { referenceType, referenceId },
      relations: ['stockCard', 'warehouse'],
      order: { createdAt: 'DESC' },
    });
  }

  async getMovementTypes(): Promise<string[]> {
    const result = await this.movementRepository
      .createQueryBuilder('m')
      .select('DISTINCT m.movementType', 'movementType')
      .getRawMany();
    return result.map((r) => r.movementType);
  }
}
