import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventorySession } from './inventory-session.entity';
import { InventorySessionLine } from './inventory-session-line.entity';
import { StockCardsService } from '../stock-cards/stock-cards.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventorySession)
    private sessionRepository: Repository<InventorySession>,
    @InjectRepository(InventorySessionLine)
    private lineRepository: Repository<InventorySessionLine>,
    private stockCardsService: StockCardsService,
    private stockMovementsService: StockMovementsService,
  ) {}

  // ─── Session CRUD ────────────────────────────────────

  async findAllSessions(
    page: number = 1,
    limit: number = 20,
    status?: string,
    warehouseId?: number,
  ): Promise<{ data: InventorySession[]; total: number; lastPage: number }> {
    const query = this.sessionRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.warehouse', 'warehouse');

    if (status) {
      query.andWhere('s.status = :status', { status });
    }
    if (warehouseId) {
      query.andWhere('s.warehouseId = :warehouseId', { warehouseId });
    }

    query.orderBy('s.createdAt', 'DESC');

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, lastPage: Math.ceil(total / limit) };
  }

  async getSession(id: number): Promise<InventorySession> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: ['warehouse', 'lines', 'lines.stockCard'],
    });
    if (!session) {
      throw new NotFoundException(`InventorySession with ID ${id} not found`);
    }
    return session;
  }

  /**
   * Create a new inventory session and snapshot theoretical stock levels.
   */
  async createSession(data: {
    sessionDate: string | Date;
    warehouseId?: number;
    countType?: string;
    scope?: string;
    isBlindCount?: boolean;
    note?: string;
    createdByUserId?: number;
    stockCardIds?: number[]; // For partial count: specific card IDs
  }): Promise<InventorySession> {
    // Get stock cards to include
    let stockCards;
    if (data.stockCardIds && data.stockCardIds.length > 0) {
      // Specific cards selected (partial count)
      stockCards = [];
      for (const id of data.stockCardIds) {
        try {
          const card = await this.stockCardsService.findOne(id);
          stockCards.push(card);
        } catch {
          // Skip non-existent cards
        }
      }
    } else if (data.scope && data.scope !== 'ALL') {
      // Filter by category/scope
      const allCards = await this.stockCardsService.findAllNoPagination();
      stockCards = allCards.filter((c) => c.category === data.scope);
    } else {
      // Full count: all active stock cards
      stockCards = await this.stockCardsService.findAllNoPagination();
    }

    // Optionally filter by warehouse
    if (data.warehouseId) {
      stockCards = stockCards.filter(
        (c) => !c.warehouseId || c.warehouseId === data.warehouseId,
      );
    }

    // Create session
    const session = this.sessionRepository.create({
      sessionDate: new Date(data.sessionDate),
      warehouseId: data.warehouseId,
      countType: data.countType || 'FULL',
      scope: data.scope,
      status: 'DRAFT',
      isBlindCount: data.isBlindCount || false,
      note: data.note,
      createdByUserId: data.createdByUserId,
    });

    const savedSession = await this.sessionRepository.save(session);

    // Create lines with theoretical snapshots
    const lines: InventorySessionLine[] = [];
    for (const card of stockCards) {
      const line = new InventorySessionLine();
      line.sessionId = savedSession.id;
      line.stockCardId = card.id;
      line.unit = card.baseUnit;
      line.theoreticalQty = Number(card.currentStock);
      line.countedQty = undefined as any;
      line.differenceQty = 0;
      line.unitCost = Number(card.costPerBaseUnit);
      line.differenceCost = 0;
      line.isCounted = false;
      lines.push(line);
    }

    await this.lineRepository.save(lines);

    return this.getSession(savedSession.id);
  }

  // ─── Line Updates ────────────────────────────────────

  async updateLine(
    lineId: number,
    data: {
      countedQty?: number;
      description?: string;
    },
  ): Promise<InventorySessionLine> {
    const line = await this.lineRepository.findOne({
      where: { id: lineId },
      relations: ['stockCard'],
    });
    if (!line) {
      throw new NotFoundException(`InventorySessionLine with ID ${lineId} not found`);
    }

    if (data.countedQty !== undefined && data.countedQty !== null) {
      line.countedQty = data.countedQty;
      line.differenceQty = data.countedQty - Number(line.theoreticalQty);
      line.differenceCost = line.differenceQty * Number(line.unitCost);
      line.isCounted = true;
    }

    if (data.description !== undefined) {
      line.description = data.description;
    }

    return this.lineRepository.save(line);
  }

  /**
   * Bulk update multiple lines at once (for draft save).
   */
  async bulkUpdateLines(
    sessionId: number,
    updates: { lineId: number; countedQty?: number; description?: string }[],
  ): Promise<InventorySession> {
    for (const update of updates) {
      await this.updateLine(update.lineId, {
        countedQty: update.countedQty,
        description: update.description,
      });
    }
    return this.getSession(sessionId);
  }

  // ─── Session Status Management ───────────────────────

  async saveDraft(sessionId: number): Promise<InventorySession> {
    const session = await this.getSession(sessionId);
    if (session.status === 'COMPLETED') {
      throw new BadRequestException('Cannot modify a completed session');
    }
    session.status = 'IN_PROGRESS';
    await this.sessionRepository.save(session);
    return this.getSession(sessionId);
  }

  /**
   * Approve session: create COUNT_SURPLUS / COUNT_DEFICIT stock movements
   * and update stock card levels.
   */
  async approveSession(
    sessionId: number,
    userId?: number,
  ): Promise<InventorySession> {
    const session = await this.getSession(sessionId);
    if (session.status === 'COMPLETED') {
      throw new BadRequestException('Session is already completed');
    }
    if (session.status === 'CANCELLED') {
      throw new BadRequestException('Cannot approve a cancelled session');
    }

    // Process each counted line
    for (const line of session.lines) {
      if (!line.isCounted) continue;

      const diff = Number(line.differenceQty);
      if (diff === 0) continue;

      const movementType = diff > 0 ? 'COUNT_SURPLUS' : 'COUNT_DEFICIT';

      await this.stockMovementsService.createMovement({
        stockCardId: line.stockCardId,
        movementType,
        quantity: diff,
        unit: line.unit,
        unitCost: Number(line.unitCost),
        warehouseId: session.warehouseId || undefined,
        sourceType: 'INVENTORY_SESSION',
        sourceId: sessionId,
        description: `Sayım ${diff > 0 ? 'fazlası' : 'eksiği'}: ${line.stockCard?.name || `Stok #${line.stockCardId}`}`,
        userId,
      });
    }

    // Update session status
    session.status = 'COMPLETED';
    session.approvedByUserId = userId || null as any;
    session.approvedAt = new Date();
    await this.sessionRepository.save(session);

    return this.getSession(sessionId);
  }

  async cancelSession(sessionId: number): Promise<InventorySession> {
    const session = await this.getSession(sessionId);
    if (session.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed session');
    }
    session.status = 'CANCELLED';
    await this.sessionRepository.save(session);
    return this.getSession(sessionId);
  }

  // ─── Print List ──────────────────────────────────────

  async getPrintList(
    sessionId: number,
    isBlind: boolean = false,
  ): Promise<{
    session: InventorySession;
    lines: {
      stockCode: string;
      stockName: string;
      unit: string;
      category: string;
      theoreticalQty: number | null;
      countedQty: number | null;
    }[];
  }> {
    const session = await this.getSession(sessionId);

    const lines = session.lines.map((line) => ({
      stockCode: line.stockCard?.code || '',
      stockName: line.stockCard?.name || '',
      unit: line.unit,
      category: line.stockCard?.category || '',
      theoreticalQty: isBlind ? null : Number(line.theoreticalQty),
      countedQty: line.isCounted ? Number(line.countedQty) : null,
    }));

    return { session, lines };
  }

  // ─── Reports ─────────────────────────────────────────

  async getSessionReport(sessionId: number): Promise<{
    session: InventorySession;
    totalItems: number;
    countedItems: number;
    uncountedItems: number;
    surplusCount: number;
    deficitCount: number;
    totalSurplusCost: number;
    totalDeficitCost: number;
    netCostImpact: number;
  }> {
    const session = await this.getSession(sessionId);
    const lines = session.lines || [];

    let countedItems = 0;
    let surplusCount = 0;
    let deficitCount = 0;
    let totalSurplusCost = 0;
    let totalDeficitCost = 0;

    for (const line of lines) {
      if (line.isCounted) {
        countedItems++;
        const diff = Number(line.differenceQty);
        const cost = Number(line.differenceCost);
        if (diff > 0) {
          surplusCount++;
          totalSurplusCost += cost;
        } else if (diff < 0) {
          deficitCount++;
          totalDeficitCost += Math.abs(cost);
        }
      }
    }

    return {
      session,
      totalItems: lines.length,
      countedItems,
      uncountedItems: lines.length - countedItems,
      surplusCount,
      deficitCount,
      totalSurplusCost: Math.round(totalSurplusCost * 100) / 100,
      totalDeficitCost: Math.round(totalDeficitCost * 100) / 100,
      netCostImpact: Math.round((totalSurplusCost - totalDeficitCost) * 100) / 100,
    };
  }

  async getDifferenceReport(
    warehouseId?: number,
    category?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any[]> {
    const query = this.sessionRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.warehouse', 'warehouse')
      .leftJoinAndSelect('s.lines', 'lines')
      .leftJoinAndSelect('lines.stockCard', 'stockCard')
      .where('s.status = :status', { status: 'COMPLETED' });

    if (warehouseId) {
      query.andWhere('s.warehouseId = :warehouseId', { warehouseId });
    }
    if (startDate) {
      query.andWhere('s.sessionDate >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('s.sessionDate <= :endDate', { endDate });
    }

    const sessions = await query.orderBy('s.sessionDate', 'DESC').getMany();

    // Aggregate differences by stock card
    const cardMap = new Map<number, {
      stockCardId: number;
      stockCardName: string;
      stockCardCode: string;
      category: string;
      totalDifferenceQty: number;
      totalDifferenceCost: number;
      sessionCount: number;
    }>();

    for (const session of sessions) {
      for (const line of session.lines) {
        if (!line.isCounted) continue;
        if (category && line.stockCard?.category !== category) continue;

        const existing = cardMap.get(line.stockCardId);
        if (existing) {
          existing.totalDifferenceQty += Number(line.differenceQty);
          existing.totalDifferenceCost += Number(line.differenceCost);
          existing.sessionCount++;
        } else {
          cardMap.set(line.stockCardId, {
            stockCardId: line.stockCardId,
            stockCardName: line.stockCard?.name || '',
            stockCardCode: line.stockCard?.code || '',
            category: line.stockCard?.category || '',
            totalDifferenceQty: Number(line.differenceQty),
            totalDifferenceCost: Number(line.differenceCost),
            sessionCount: 1,
          });
        }
      }
    }

    return Array.from(cardMap.values()).sort(
      (a, b) => Math.abs(b.totalDifferenceCost) - Math.abs(a.totalDifferenceCost),
    );
  }
}
