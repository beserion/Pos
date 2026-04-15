import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StockMovement } from './stock-movement.entity';
import { StockCardsService } from '../stock-cards/stock-cards.service';
import { RecipesService } from '../recipes/recipes.service';
import { ParametersService } from '../parameters/parameters.service';
import { Product } from '../products/product.entity';
import { StocksService } from '../stocks/stocks.service';

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
    private stocksService: StocksService,
  ) {}

  // ─── Core Movement Creation ──────────────────────────

  // ─── Core Movement Creation ──────────────────────────

  async createMovement(data: {
    stockCardId: number;
    movementType: string;
    quantity: number; // Net miktar
    qtyIn?: number;
    qtyOut?: number;
    unit?: string;
    unitCost?: number;
    warehouseId?: number;
    businessDate?: Date;
    documentType?: string;
    documentNo?: string;
    sourceType?: string;
    sourceId?: number;
    referenceType?: string;
    referenceId?: number;
    approveUserId?: number;
    reasonCode?: string;
    description?: string;
    note?: string;
    userId?: number;
  }, manager?: any): Promise<StockMovement> {
    const repo = manager ? manager.getRepository(StockMovement) : this.movementRepository;

    const card = await this.stockCardsService.findOne(data.stockCardId);
    const unitCost = data.unitCost ?? Number(card.costPerBaseUnit);
    const totalCost = Math.abs(data.quantity) * unitCost;

    // §15: qtyBefore
    const qtyBefore = Number(card.currentStock);

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
      businessDate: data.businessDate || new Date(),
      qtyIn: data.qtyIn ?? (data.quantity > 0 ? data.quantity : 0),
      qtyOut: data.qtyOut ?? (data.quantity < 0 ? Math.abs(data.quantity) : 0),
      quantity: data.quantity,
      qtyIn,
      qtyOut,
      qtyBefore,
      stockAfter: newStockLevel,
      unit: data.unit || card.baseUnit,
      unitCost,
      totalCost,
      warehouseId: data.warehouseId || card.warehouseId,
      documentType: data.documentType,
      documentNo: data.documentNo,
      sourceType: data.sourceType || data.referenceType,
      sourceId: data.sourceId || data.referenceId,
      referenceType: data.referenceType || data.sourceType,
      referenceId: data.referenceId || data.sourceId,
      approveUserId: data.approveUserId,
      reasonCode: data.reasonCode,
      note: data.note || data.description,
      description: data.description || data.note,
      userId: data.userId,
    });

    const saved = await repo.save(movement);

    // Sync with warehouse-based stocks table (StocksService)
    try {
      const location = data.warehouseId ? `Warehouse #${data.warehouseId}` : 'default';
      if (data.quantity > 0) {
        await this.stocksService.addStock(data.stockCardId, data.quantity, location, manager);
      } else if (data.quantity < 0) {
        await this.stocksService.deductStock(data.stockCardId, Math.abs(data.quantity), location, manager);
      }
    } catch (e) {
      console.error('StockMovementsService: Error syncing with StocksService:', e);
    }

    return saved;
  }

  // ─── Sales Consumption ───────────────────────────────

  /**
   * Consume stock for a product that is linked directly to a stock card.
   * Creates direct_sale_consumption movement.
   */
  async createDirectSaleConsumption(
    stockCardId: number,
    quantity: number,
    unit: string,
    sourceType: string = 'SALE',
    sourceId?: number,
    userId?: number,
    warehouseId?: number,
    manager?: any,
  ): Promise<StockMovement> {
    return this.createMovement({
      stockCardId,
      movementType: 'direct_sale_consumption',
      quantity: -quantity,
      qtyOut: quantity,
      unit,
      sourceType,
      sourceId,
      warehouseId,
      description: `Direkt ürün satışı (Stock Link)`,
      userId,
    }, manager);
  }

  /**
   * Consume stock based on a product's recipe when a sale is completed.
   * Creates recipe_consumption movements for each recipe line.
   */
  async createRecipeConsumption(
    productId: number,
    saleQuantity: number,
    saleTypeMultiplier: number = 1,
    sourceType: string = 'SALE',
    sourceId?: number,
    userId?: number,
    warehouseId?: number,
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
        movementType: 'recipe_consumption',
        quantity: -consumeQty, 
        qtyOut: consumeQty,
        unit: line.unit,
        sourceType,
        sourceId,
        warehouseId,
        description: `Reçete tüketimi: ${recipe.product?.name || `Ürün #${productId}`}`,
        userId,
      }, manager);

      movements.push(movement);
    }

    return movements;
  }

  /**
   * Consume stock based on a specific recipe header (e.g. for a product variation).
   */
  async createRecipeConsumptionByHeaderId(
    recipeHeaderId: number,
    saleQuantity: number,
    saleTypeMultiplier: number = 1,
    sourceType: string = 'SALE',
    sourceId?: number,
    userId?: number,
    warehouseId?: number,
    manager?: any,
  ): Promise<StockMovement[]> {
    const header = await this.recipesService.findOne(recipeHeaderId);
    if (!header || !header.lines || header.lines.length === 0) {
      return [];
    }

    const movements: StockMovement[] = [];
    for (const line of header.lines) {
      const consumeQty = Number(line.quantity) * saleQuantity * saleTypeMultiplier;
      if (consumeQty <= 0) continue;

      const movement = await this.createMovement({
        stockCardId: line.stockCardId,
        movementType: 'recipe_consumption',
        quantity: -consumeQty,
        qtyOut: consumeQty,
        unit: line.unit,
        sourceType,
        sourceId,
        warehouseId,
        descriptio  // ─── Direct Stock Consumption (§12.2) ────────────────

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
   * Robust reverse consumption (for cancellations/refunds).
   * Handles direct stock, variations, and recipes.
   */
  async createReverseConsumption(
    productId: number,
    saleQuantity: number,
    saleTypeMultiplier: number = 1,
    sourceType: string = 'SALE',
    sourceId?: number,
    userId?: number,
    manager?: any,
    variationId?: number,
  ): Promise<StockMovement[]> {
    const restoreParam = await this.parametersService.getValue(
      'inventory',
      'stock_restore_on_cancel',
    );
    if (restoreParam === 'false') return [];

    const productResults = await manager.query(`SELECT inventoryLinkType, linkedStockCardId, directStockQty, directStockUnit FROM products WHERE id = ${productId}`);
    if (!productResults || productResults.length === 0) return [];
    const product = productResults[0];

    let variation = null;
    if (variationId) {
      const variations = await manager.query(`SELECT inventoryLinkType, linkedStockCardId, directStockQty, directStockUnit, recipeHeaderId FROM product_variations WHERE id = ${variationId}`);
      variation = variations?.[0] || null;
    }

    const linkType = variation?.inventoryLinkType || product.inventoryLinkType;

    if (linkType === 'direct_stock') {
      const stockCardId = variation?.linkedStockCardId || product.linkedStockCardId;
      const stockQty = variation?.directStockQty || product.directStockQty;
      const stockUnit = variation?.directStockUnit || product.directStockUnit;

      if (stockCardId && stockQty) {
        const restoreQty = Number(stockQty) * saleQuantity * saleTypeMultiplier;
        const movement = await this.createMovement({
          stockCardId,
          movementType: 'return_in', 
          quantity: restoreQty,
          qtyIn: restoreQty,
          unit: stockUnit,
          sourceType,
          sourceId,
          referenceType: sourceType,
          referenceId: sourceId,
          description: `Satış iptal iadesi (Direkt Stok)`,
          userId,
        }, manager);
        return [movement];
      }
    }

    if (linkType === 'recipe') {
      let recipeHeader = null;
      if (variation?.recipeHeaderId) {
        const headerCheck = await manager.query(`SELECT id FROM recipe_headers WHERE id = ${variation.recipeHeaderId} AND isActive = 1`);
        if (headerCheck && headerCheck.length > 0) {
           recipeHeader = await this.recipesService.findOne(headerCheck[0].id);
        }
      }

      const recipe = recipeHeader || await this.recipesService.findActiveByProduct(productId);
      if (!recipe || !recipe.lines || recipe.lines.length === 0) return [];

      const movements: StockMovement[] = [];
      for (const line of recipe.lines) {
        const restoreQty = Number(line.quantity) * saleQuantity * saleTypeMultiplier;
        if (restoreQty <= 0) continue;

        const movement = await this.createMovement({
          stockCardId: line.stockCardId,
          movementType: 'return_in',
          quantity: restoreQty,
          qtyIn: restoreQty,
          unit: line.unit,
          sourceType,
          sourceId,
          referenceType: sourceType,
          referenceId: sourceId,
          description: `Satış iptal iadesi (Reçete): ${recipe.product?.name || `Ürün #${productId}`}`,
          userId,
        }, manager);
        movements.push(movement);
      }
      return movements;
    }

    return [];
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
      sourceType: 'TRANSFER',
      description: data.description || 'Depolar arası transfer',
      userId: data.userId,
    });

    const inMovement = await this.createMovement({
      stockCardId: data.stockCardId,
      movementType: 'TRANSFER_IN',
      quantity: qty,
      warehouseId: data.toWarehouseId,
      sourceType: 'TRANSFER',
      sourceId: out.id,
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

  async findByReference(sourceType: string, sourceId: number): Promise<StockMovement[]> {
    return this.movementRepository.find({
      where: { sourceType, sourceId },
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

  /**
   * Delete movements by source and REVERSE their impact on stock card currentStock.
   */
  async deleteMovementsBySource(
    sourceType: string,
    sourceId: number,
    manager?: any,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(StockMovement)
      : this.movementRepository;

    const movements = await repo.find({ where: { sourceType, sourceId } });

    for (const m of movements) {
      // 1. Reverse high-level stock card currentStock
      await this.stockCardsService.adjustStock(
        m.stockCardId,
        -Number(m.quantity),
        manager,
      );

      // 2. Reverse warehouse-based stock (StocksService)
      try {
        const location = m.warehouseId ? `Warehouse #${m.warehouseId}` : 'default';
        const reverseQty = -Number(m.quantity);
        if (reverseQty > 0) {
          await this.stocksService.addStock(m.stockCardId, reverseQty, location, manager);
        } else if (reverseQty < 0) {
          await this.stocksService.deductStock(m.stockCardId, Math.abs(reverseQty), location, manager);
        }
      } catch (e) {
        console.error('StockMovementsService: Error reversing StocksService in deleteMovementsBySource:', e);
      }
    }

    // Delete the movements
    await repo.remove(movements);
  }
}
