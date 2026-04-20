import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StockMovement } from './stock-movement.entity';
import { StockCardsService } from '../stock-cards/stock-cards.service';
import { RecipesService } from '../recipes/recipes.service';
import { ParametersService } from '../parameters/parameters.service';
import { StocksService } from '../stocks/stocks.service';

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement)
    private movementRepository: Repository<StockMovement>,
    private stockCardsService: StockCardsService,
    @Inject(forwardRef(() => RecipesService))
    private recipesService: RecipesService,
    private parametersService: ParametersService,
    private stocksService: StocksService,
  ) {}

  private readonly logger = new Logger(StockMovementsService.name);

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
    approveUserId?: number;
    reasonCode?: string;
    description?: string;
    userId?: number;
  }, manager?: any): Promise<StockMovement> {
    const repo = manager ? manager.getRepository(StockMovement) : this.movementRepository;

    const card = await this.stockCardsService.findOne(data.stockCardId);
    const qtyBefore = Number(card.currentStock);

    let unitCostValue = data.unitCost ?? Number(card.costPerBaseUnit);

    // ─── Cost Calculation Logic ──────────────────────────
    const costs: {
      lastPurchasePrice?: number;
      averageCost?: number;
      costPerBaseUnit?: number;
    } = {};

    if (data.quantity > 0 && data.unitCost != null && !isNaN(data.unitCost)) {
      const method =
        (await this.parametersService.getValue(
          'stocks',
          'stock_valuation_method',
        )) || 'Ortalama Maliyet';

      const newQty = Number(data.quantity); // Gelen miktar
      const newUnitCost = Number(data.unitCost); // Gelen birim maliyet
      const oldQtyRaw = Number(card.currentStock); // Eldeki miktar (string olabilir, Number garantiye alıyor)
      const oldAvg = Number(card.averageCost) || 0; // Eldeki ortalama maliyet

      // Negatif stok koruması: Eğer eski stok negatifse, maliyet bazını 0 kabul et.
      const oldQty = Math.max(0, oldQtyRaw);

      costs.lastPurchasePrice = newUnitCost;

      // Ağırlıklı Ortalama Maliyet Formülü
      const totalValue = oldQty * oldAvg + newQty * newUnitCost;
      const totalQty = oldQty + newQty;

      if (totalQty > 0) {
        costs.averageCost = totalValue / totalQty;
      } else {
        costs.averageCost = newUnitCost;
      }

      // Güvenlik: NaN veya Infinity oluşursa yeni maliyeti baz al.
      if (!isFinite(costs.averageCost) || isNaN(costs.averageCost)) {
        costs.averageCost = newUnitCost;
      }

      // Değerleme yöntemine göre gösterge maliyetini eşitle (Birim Maliyet sütunu için)
      if (method.trim() === 'Ortalama Maliyet') {
        costs.costPerBaseUnit = costs.averageCost;
      } else {
        // FIFO/LIFO vb için şimdilik ortalama maliyet gösterimi mantıklıdır.
        costs.costPerBaseUnit = costs.averageCost;
      }

      unitCostValue = newUnitCost;

      this.logger.log(
        `[CostCalc] Card: ${card.name} (#${data.stockCardId}), Method: ${method}, ` +
          `OldQty: ${oldQtyRaw} (used: ${oldQty}), OldAvg: ${oldAvg}, ` +
          `NewQty: ${newQty}, NewCost: ${newUnitCost} -> NewAvg: ${costs.averageCost}`,
      );
    } else if (data.quantity > 0) {
      this.logger.warn(
        `[CostCalc] Skipping cost for card ${data.stockCardId} because unitCost is invalid: ${data.unitCost}`,
      );
    }

    const totalCost = data.quantity * unitCostValue;

    // Update the stock card's currentStock and costs atomically
    const newStockLevel = await this.stockCardsService.updateStockAndCost(
      data.stockCardId,
      data.quantity,
      costs,
      manager,
    );

    const movement = repo.create({
      stockCardId: data.stockCardId,
      movementType: data.movementType,
      businessDate: data.businessDate || new Date(),
      qtyIn: data.qtyIn ?? (data.quantity > 0 ? data.quantity : 0),
      qtyOut: data.qtyOut ?? (data.quantity < 0 ? Math.abs(data.quantity) : 0),
      quantity: data.quantity,
      unit: data.unit || card.baseUnit,
      unitCost: unitCostValue,
      totalCost,
      qtyBefore,
      stockAfter: newStockLevel,
      warehouseId: data.warehouseId || card.warehouseId,
      documentType: data.documentType,
      documentNo: data.documentNo,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      approveUserId: data.approveUserId,
      reasonCode: data.reasonCode,
      description: data.description,
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
        description: `Reçete tüketimi (Varyant): ${header.name || `RecipeHeader #${recipeHeaderId}`}`,
        userId,
      }, manager);

      movements.push(movement);
    }

    return movements;
  }

  /**
   * Reverse consumption (for cancellations/refunds).
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

    const product = await manager.query(`SELECT inventoryLinkType, linkedStockItemId, directStockQty, directStockUnit FROM products WHERE id = ${productId}`);
    if (!product || product.length === 0) return [];

    let variation = null;
    if (variationId) {
      const variations = await manager.query(`SELECT inventoryLinkType, linkedStockItemId, directStockQty, directStockUnit, recipeHeaderId FROM product_variations WHERE id = ${variationId}`);
      variation = variations?.[0] || null;
    }

    const linkType = variation?.inventoryLinkType || product[0].inventoryLinkType;

    if (linkType === 'direct_stock') {
      const stockItemId = variation?.linkedStockItemId || product[0].linkedStockItemId;
      const stockQty = variation?.directStockQty || product[0].directStockQty;
      const stockUnit = variation?.directStockUnit || product[0].directStockUnit;

      if (stockItemId && stockQty) {
        const restoreQty = Number(stockQty) * saleQuantity;
        const movement = await this.createMovement({
          stockCardId: stockItemId,
          movementType: 'return_in', 
          quantity: restoreQty,
          qtyIn: restoreQty,
          unit: stockUnit,
          sourceType,
          sourceId,
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
    movementType: 'MANUAL_IN' | 'MANUAL_OUT' | 'WASTAGE' | 'STAFF_CONSUME' | 'COMPLIMENTARY';
    quantity: number;
    unit?: string;
    warehouseId?: number;
    description?: string;
    userId?: number;
  }): Promise<StockMovement> {
    const qty = ['MANUAL_OUT', 'WASTAGE', 'STAFF_CONSUME', 'COMPLIMENTARY'].includes(data.movementType)
      ? -Math.abs(data.quantity)
      : Math.abs(data.quantity);

    return this.createMovement({
      ...data,
      quantity: qty,
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
