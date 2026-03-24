import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Recipe } from '../recipes/recipe.entity';
import { Sale } from './sale.entity';
import { SaleItem } from './sale-item.entity';
import { RecipesService } from '../recipes/recipes.service';
import { StocksService } from '../stocks/stocks.service';
import { Table } from '../tables/table.entity';
import { User } from '../users/user.entity';
import { KitchenGateway } from '../orders/kitchen.gateway';
import { FinanceService } from '../finance/finance.service';
import { PartnersService } from '../partners/partners.service';
import { PrintersService } from '../printers/printers.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class SalesService implements OnModuleInit {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private saleItemRepository: Repository<SaleItem>,
    private recipesService: RecipesService,
    private stocksService: StocksService,
    private kitchenGateway: KitchenGateway,
    private financeService: FinanceService,
    private partnersService: PartnersService,
    private printersService: PrintersService,
    private alertsService: AlertsService,
  ) { }

  async onModuleInit() {
    await this.ensureSchema();
  }

  private async ensureSchema() {
    try {
      const queryRunner = this.saleRepository.manager.connection.createQueryRunner();
      const table = await queryRunner.getTable('sales');
      if (table && !table.columns.find(c => c.name === 'isEndOfDayClosed')) {
        this.logger.log('Adding isEndOfDayClosed column to sales table...');
        await queryRunner.addColumn('sales', {
          name: 'isEndOfDayClosed',
          type: 'bit',
          isNullable: false,
          default: 0
        } as any);
      }

      const itemsTable = await queryRunner.getTable('sale_items');
      if (itemsTable) {
        if (!itemsTable.columns.find(c => c.name === 'isWaiting')) {
          this.logger.log('Adding isWaiting column to sale_items table...');
          await queryRunner.addColumn('sale_items', {
            name: 'isWaiting',
            type: 'bit',
            isNullable: false,
            default: 0
          } as any);
        }
        if (!itemsTable.columns.find(c => c.name === 'isMarshed')) {
          this.logger.log('Adding isMarshed column to sale_items table...');
          await queryRunner.addColumn('sale_items', {
            name: 'isMarshed',
            type: 'bit',
            isNullable: false,
            default: 0
          } as any);
        }
        if (!itemsTable.columns.find(c => c.name === 'isReady')) {
          this.logger.log('Adding isReady column to sale_items table...');
          await queryRunner.addColumn('sale_items', {
            name: 'isReady',
            type: 'bit',
            isNullable: false,
            default: 0
          } as any);
        }
      }
      await queryRunner.release();
    } catch (error) {
      this.logger.error('Error ensuring schema for sales tables:', error);
    }
  }

  // Helper to fetch and map products bypassing TypeORM eager relation issues
  private async mapProductsToSales(sales: Sale[], manager?: any): Promise<Sale[]> {
    if (sales.length === 0) return sales;
    const saleItemIds = sales.flatMap(s => s.items?.map(i => i.id) || []);

    if (saleItemIds.length > 0) {
      const runner = manager ? manager : this.saleRepository;
      const rawProducts: any[] = await runner.query(`
          SELECT si.id as saleItemId, p.*
          FROM sale_items si
          JOIN products p ON si.productId = p.id
          WHERE si.id IN (${saleItemIds.join(',')})
      `);

      sales.forEach(s => {
        s.items?.forEach(item => {
          const match = rawProducts.find(rp => rp.saleItemId === item.id);
          if (match) {
            (item as any).product = match as any;
          }
        });
      });
    }
    return sales;
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    status?: string,
    tableId?: number,
    userId?: number,
    startDate?: string,
    endDate?: string,
  ): Promise<{ data: Sale[]; total: number; page: number; lastPage: number }> {
    try {
      const query = this.saleRepository.createQueryBuilder('sale')
        .leftJoinAndSelect('sale.items', 'items')
        .leftJoinAndSelect('sale.table', 'table')
        .leftJoinAndSelect('sale.waiter', 'waiter')
        .leftJoinAndSelect('waiter.role', 'role')
        .orderBy('sale.createdAt', 'DESC');

      if (startDate && startDate.trim() !== '') {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
          query.andWhere('sale.createdAt >= :startDate', { startDate: start });
        }
      }

      if (endDate && endDate.trim() !== '') {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          query.andWhere('sale.createdAt <= :endDate', { endDate: endOfDay });
        }
      }

      if (status && status !== 'ALL') {
        if (status === 'ACTIVE') {
          query.andWhere('sale.status IN (:...statuses)', { statuses: ['NEW', 'PREPARATION', 'READY', 'SERVED'] });
        } else {
          query.andWhere('sale.status = :status', { status });
        }
      } else {
        // By default, exclude CANCELLED records so they don't appear in totals
        query.andWhere('sale.status != :cancelled', { cancelled: 'CANCELLED' });
      }

      if (tableId) {
        query.andWhere('sale.tableId = :tableId', { tableId });
      }

      if (userId) {
        query.andWhere('sale.waiterId = :userId', { userId });
      }

      const [sales, total] = await query
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      const mappedData = await this.mapProductsToSales(sales);

      return {
        data: mappedData,
        total,
        page,
        lastPage: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Error in findAll sales:', error);
      throw error;
    }
  }

  async findOne(id: number): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id },
      relations: ['items', 'table', 'table.zone', 'waiter'],
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }
    const mapped = await this.mapProductsToSales([sale]);
    return mapped[0];
  }

  async updateStatus(id: number, status: string): Promise<Sale> {
    const sale = await this.findOne(id);
    sale.status = status;
    const updated = await this.saleRepository.save(sale);
    this.kitchenGateway.notifyOrderUpdated(updated as any);
    this.kitchenGateway.notifySaleUpdate(updated);

    if (status === 'READY') {
      const locationName = updated.table?.zone ? `${updated.table.zone.name} bölümü, ${updated.table.name}` : (updated.tableName || 'Paket');
      this.alertsService.trigger('KDS_MESSAGE_ACTIVE', {
        triggerUserId: undefined,
        triggerUserName: 'Mutfak (KDS)',
        saleId: updated.id,
        tableId: updated.tableId,
        tableName: updated.tableName,
        description: `${locationName} siparişiniz hazır!`,
        dynamicTargetUserId: updated.waiterId || updated.userId,
      }).catch(() => {});
    }

    return updated;
  }

  async create(saleData: Partial<Sale>): Promise<Sale> {
    return await this.saleRepository.manager.transaction(async (manager) => {
      try {
        const { items, ...dataRaw } = saleData;
        const mergeSaleIds = (dataRaw as any).mergeSaleIds;
        delete (dataRaw as any).mergeSaleIds;
        const data = dataRaw;

        (data as any).tableId = data.tableId || null;
        (data as any).shiftId = data.shiftId || null;
        (data as any).cashRegisterId = data.cashRegisterId || null;
        (data as any).waiterId = data.waiterId || null;
        (data as any).userId = data.userId || null;
        (data as any).partnerId = data.partnerId || null;

        // Handle Partner (Customer) default
        if (!data.partnerId) {
          const retailPartner = await this.partnersService.getOrCreateRetailCustomer();
          data.partnerId = retailPartner.id;
        }

        const newSale = manager.create(Sale, data);
        const savedSale = await manager.save(Sale, newSale);

        if (items && items.length > 0) {
          const saleItems = items.map(item => manager.create(SaleItem, {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice || 0,
            total: item.total || (Number(item.quantity) * Number(item.unitPrice)),
            note: item.note,
            isWaiting: item.isWaiting || false,
            isMarshed: false,
            sale: savedSale,
            isPaid: savedSale.status === 'COMPLETED'
          }));
          await manager.save(SaleItem, saleItems);
          savedSale.items = saleItems;
        }

        // Finance kaydı ARTIK BURADA AÇILMIYOR.
        // Tüm satış hareketleri Gün Sonu (endOfDay) alındığında
        // account_transactions tablosuna toplu olarak upsert edilir.

        // Table Status update
        if (data.tableId) {
          const table = await manager.findOne(Table, { where: { id: data.tableId, isDeleted: false } });
          if (table) {
            const waiter = await manager.findOne(User, { where: { id: data.waiterId || (data as any).userId } });
            await manager.update(Table, data.tableId, {
              status: savedSale.status === 'COMPLETED' ? 'BOŞ' : 'DOLU',
              waiterName: savedSale.status === 'COMPLETED' ? '' : (waiter ? `${waiter.firstName} ${waiter.lastName}` : (table.waiterName || 'Sistem')),
              currentTotal: savedSale.status === 'COMPLETED' ? 0 : (Number(table.currentTotal || 0) + Number(savedSale.totalAmount)),
              orderStartTime: table.status === 'BOŞ' ? new Date() : (savedSale.status === 'COMPLETED' ? null as any : table.orderStartTime),
            });
          }
        }

        // Stock deduction & Old Order Cleanup
        if (!mergeSaleIds || mergeSaleIds.length === 0) {
          await this.deductStockForSale(savedSale, manager);
        } else {
          for (const oldId of mergeSaleIds) {
            const oldSale = await manager.findOne(Sale, { where: { id: oldId }, relations: ['items'] });
            if (oldSale) {
              if (oldSale.items) await manager.delete(SaleItem, oldSale.items.map(i => i.id));
              await manager.delete(Sale, oldId);
            }
          }
        }

        const refreshedSale = await manager.findOne(Sale, {
          where: { id: savedSale.id },
          relations: ['items', 'table', 'table.zone', 'waiter']
        }) as Sale;
        const fullSales = await this.mapProductsToSales([refreshedSale], manager);
        const fullSale = fullSales[0];

        // Yüksek indirim bildirimi
        if (Number(data.discountAmount || 0) > 0 && Number(data.totalAmount || 0) > 0) {
          const discountRate = (Number(data.discountAmount) / (Number(data.totalAmount) + Number(data.discountAmount))) * 100;
          const waiterUser = data.waiterId
            ? await manager.findOne(User, { where: { id: data.waiterId } })
            : null;
          this.alertsService.trigger('SALE_DISCOUNT_HIGH', {
            triggerUserId: data.waiterId,
            triggerUserName: waiterUser ? `${waiterUser.firstName} ${waiterUser.lastName}` : undefined,
            saleId: savedSale.id,
            tableId: data.tableId,
            tableName: data.tableName,
            description: `İndirim uygulandı: %${discountRate.toFixed(1)} (₺${data.discountAmount}) — Masa: ${data.tableName || '-'}`,
            numericValue: discountRate,
          }).catch(() => {});
        }

        // İkram bildirimi (toplam tutar 0)
        if (Number(data.totalAmount || 0) === 0 && (fullSale.items?.length || 0) > 0) {
          this.alertsService.trigger('SALE_COMPLIMENTARY', {
            triggerUserId: data.waiterId,
            saleId: savedSale.id,
            tableId: data.tableId,
            tableName: data.tableName,
            description: `İkram yapıldı — Masa: ${data.tableName || '-'}`,
          }).catch(() => {});
        }

        // Notify real-time listeners (Admin, POS, etc.)
        this.kitchenGateway.notifySaleUpdate(fullSale);

        // Notify kitchen specifically for new preparation orders
        if (fullSale.status === 'NEW' || fullSale.status === 'PREPARATION') {
          this.kitchenGateway.notifyNewOrder(fullSale as any);
        }

        return fullSale;
      } catch (error: any) {
        console.error('SALE CREATE ERROR:', error.message);
        throw error;
      }
    });
  }

  async marsItem(itemId: number): Promise<SaleItem> {
    const item = await this.saleItemRepository.findOne({
      where: { id: itemId },
      relations: ['sale', 'sale.table']
    });
    if (!item) throw new NotFoundException('Ürün bulunamadı');

    item.isMarshed = true;
    const updated = await this.saleItemRepository.save(item);

    // Mutfak bildirimini gönder
    this.kitchenGateway.server.emit('itemMarshed', {
      itemId: item.id,
      saleId: item.sale?.id,
      tableName: item.sale?.tableName,
      productId: item.productId,
      isMarshed: true
    });

    // Yazıcıya gönder
    const rawProduct = await this.saleRepository.query(`
      SELECT p.name, p.printerId FROM products p WHERE p.id = ${item.productId}
    `);

    if (rawProduct && rawProduct.length > 0) {
      await this.printersService.printMars({
        tableName: item.sale?.tableName,
        item: {
          name: rawProduct[0].name,
          quantity: item.quantity,
          note: item.note,
          printerId: rawProduct[0].printerId
        }
      });
    }

    return updated;
  }

  async readyItem(itemId: number): Promise<SaleItem> {
    const item = await this.saleItemRepository.findOne({
      where: { id: itemId },
      relations: ['sale', 'sale.waiter', 'sale.table', 'sale.table.zone']
    });
    if (!item) throw new NotFoundException('Ürün bulunamadı');

    item.isReady = !item.isReady;
    const updated = await this.saleItemRepository.save(item);

    // Mutfak bildirimini gönder
    this.kitchenGateway.server.emit('itemReady', {
      itemId: item.id,
      saleId: item.sale?.id,
      productId: item.productId,
      isReady: updated.isReady
    });

    if (updated.isReady && item.sale) {
      const locationName = item.sale.table?.zone ? `${item.sale.table.zone.name} bölümü, ${item.sale.table.name}` : (item.sale.tableName || 'Paket');
      this.alertsService.trigger('KDS_MESSAGE_ACTIVE', {
        triggerUserId: undefined,
        triggerUserName: 'Mutfak (KDS)',
        saleId: item.sale.id,
        tableId: item.sale.tableId,
        tableName: item.sale.tableName,
        description: `${locationName} siparişinizde bir ürün hazır!`,
        dynamicTargetUserId: item.sale.waiterId || item.sale.userId,
      }).catch(() => {});
    }

    return updated;
  }

  async payItem(itemId: number, paymentMethod: string, partnerId?: number): Promise<void> {
    return this.payBatchItems({ itemIds: [itemId], paymentMethod, partnerId });
  }

  async payBatchItems(payload: { itemIds: number[], paymentMethod: string, partnerId?: number, paidAmountCash?: number, paidAmountCreditCard?: number }): Promise<void> {
    const { itemIds, paymentMethod, partnerId, paidAmountCash, paidAmountCreditCard } = payload;
    if (!itemIds || itemIds.length === 0) return;

    await this.saleRepository.manager.transaction(async (manager) => {
      const items = await manager.find(SaleItem, {
        where: { id: In(itemIds) },
        relations: ['sale', 'sale.table']
      });
      
      const unpaidItems = items.filter(i => !i.isPaid);
      if (unpaidItems.length === 0) return;

      const totalCheckoutAmount = unpaidItems.reduce((sum, item) => sum + (item.total || Number(item.unitPrice) * Number(item.quantity)), 0);
      const firstItemSale = unpaidItems[0].sale;
      const table = firstItemSale?.table;

      // 1. Create a unified COMPLETED Sale for these paid items
      const checkoutSale = manager.create(Sale, {
        partnerId: partnerId || firstItemSale?.partnerId,
        userId: firstItemSale?.userId || firstItemSale?.waiterId,
        waiterId: firstItemSale?.waiterId,
        tableId: table?.id,
        tableName: table?.name,
        totalAmount: totalCheckoutAmount,
        status: 'COMPLETED',
        paymentMethod: paymentMethod || 'KASA',
        paidAmountCash: paymentMethod === 'SPLIT' ? (paidAmountCash || 0) : (paymentMethod === 'KASA' || paymentMethod === 'CASH' ? totalCheckoutAmount : 0),
        paidAmountCreditCard: paymentMethod === 'SPLIT' ? (paidAmountCreditCard || 0) : (paymentMethod === 'KREDI_KARTI' || paymentMethod === 'CREDIT_CARD' ? totalCheckoutAmount : 0),
        paidAmountBank: (paymentMethod === 'BANKA' || paymentMethod === 'EFT') ? totalCheckoutAmount : 0,
        discountAmount: 0,
        serviceFee: 0,
        isEndOfDayClosed: false,
      }) as any;
      
      const savedCheckoutSale = await manager.save(Sale, checkoutSale);

      // Collect the old Sale IDs to check for cleanup later
      const oldSaleIds = new Set<number>();

      // 2. Transfer items to this checkout sale and mark as paid
      for (const item of unpaidItems) {
        if (item.sale && item.sale.id) oldSaleIds.add(item.sale.id);
        
        item.isPaid = true;
        item.sale = savedCheckoutSale;
        await manager.save(SaleItem, item);
      }

      // 3. Update Table totals
      if (table) {
        const freshTable = await manager.findOne(Table, { where: { id: table.id } });
        if (freshTable) {
          const newTotal = Math.max(0, Number(freshTable.currentTotal || 0) - totalCheckoutAmount);
          freshTable.currentTotal = newTotal;
          if (newTotal === 0) {
            freshTable.status = 'BOŞ';
            freshTable.waiterName = '';
            freshTable.orderStartTime = null as any;
          }
          await manager.save(Table, freshTable);
        }
      }

      // 4. Finance kaydı ARTIK BURADA AÇILMIYOR.
      // Kasa/masa ödemelerinin finans hareketi Gün Sonu (endOfDay) ile
      // account_transactions tablosuna toplu upsert edilir.

      // 5. Cleanup empty old temporary sales
      for (const oldSaleId of oldSaleIds) {
        const remainingItems = await manager.count(SaleItem, { where: { sale: { id: oldSaleId } } });
        if (remainingItems === 0) {
          await manager.delete(Sale, oldSaleId);
        } else {
          // If the old sale still has items, update its totalAmount
          const remainingItemsData = await manager.find(SaleItem, { where: { sale: { id: oldSaleId } } });
          const newTotalAmount = remainingItemsData.reduce((sum, item) => sum + (item.total || Number(item.unitPrice) * Number(item.quantity)), 0);
          await manager.update(Sale, oldSaleId, { totalAmount: newTotalAmount });
        }
      }
    });

  }

  async getKitchenOrders(status?: string): Promise<Sale[]> {
    const statuses = status ? [status] : ['NEW', 'PREPARATION'];
    const query = this.saleRepository.createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('sale.table', 'table')
      .leftJoinAndSelect('sale.waiter', 'waiter')
      .where('sale.status IN (:...statuses)', { statuses })
      .andWhere('sale.tableId IS NOT NULL')
      .andWhere('sale.isEndOfDayClosed = 0')
      .orderBy(status === 'READY' ? 'sale.updatedAt' : 'sale.createdAt', status === 'READY' ? 'DESC' : 'ASC');

    if (status === 'READY') {
      query.take(50);
    }

    const sales = await query.getMany();

    return this.mapProductsToSales(sales);
  }

  async getKitchenCounts(): Promise<{ pending: number; finished: number; total: number }> {
    const pending = await this.saleRepository.count({
      where: [
        { status: 'NEW' as any, isEndOfDayClosed: false },
        { status: 'PREPARATION' as any, isEndOfDayClosed: false },
      ],
    });
    const finished = await this.saleRepository.count({ where: { status: 'READY' as any, isEndOfDayClosed: false } });
    const total = pending + finished;
    return { pending, finished, total };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutomaticEndOfDay() {
    this.logger.log('Zamanlanmış görev: Otomatik Gün Sonu başlatılıyor...');
    try {
      const result = await this.endOfDay();
      this.logger.log(`Otomatik Gün Sonu tamamlandı: Toplam ₺${result.grandTotal}`);
    } catch (error) {
      this.logger.error('Otomatik Gün Sonu sırasında hata oluştu:', error);
    }
  }

  async endOfDay(userId?: number): Promise<{
    date: string;
    cashTotal: number;
    cardTotal: number;
    bankTotal: number;
    grandTotal: number;
  }> {
    // Bugünün başlangıcı ve sonu
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Bugün tamamlanan ve henüz gün sonu kapatılmamış satışları çek
    const sales = await this.saleRepository
      .createQueryBuilder('sale')
      .where('sale.status = :status', { status: 'COMPLETED' })
      .andWhere('sale.status != :cancelled', { cancelled: 'CANCELLED' })
      .andWhere('sale.createdAt >= :start', { start: todayStart })
      .andWhere('sale.createdAt <= :end', { end: todayEnd })
      .andWhere('sale.isEndOfDayClosed = :closed', { closed: false })
      .getMany();

    if (sales.length === 0) {
      return { date: todayStart.toLocaleDateString('tr-TR'), cashTotal: 0, cardTotal: 0, bankTotal: 0, grandTotal: 0 };
    }

    let cashTotal = 0;
    let cardTotal = 0;
    let bankTotal = 0;

    for (const sale of sales) {
      const method = sale.paymentMethod?.toUpperCase();
      if (method === 'KASA' || method === 'CASH') {
        cashTotal += Number(sale.totalAmount);
      } else if (method === 'KREDI_KARTI' || method === 'CREDIT_CARD' || method === 'CC') {
        cardTotal += Number(sale.totalAmount);
      } else if (method === 'BANKA' || method === 'EFT' || method === 'HAVALE') {
        bankTotal += Number(sale.totalAmount);
      } else {
        // paymentMethod belirsizse ayrıştırılmış alanları kullan
        cashTotal += Number(sale.paidAmountCash || 0);
        cardTotal += Number(sale.paidAmountCreditCard || 0);
      }
    }

    const dateStr = todayStart.toLocaleDateString('tr-TR');

    // Finans kayıtlarını upsert et (aynı gün tekrar yapılırsa yeni kayıt açmaz, mevcut güncellenir)
    if (cashTotal > 0) {
      await this.financeService.upsertEndOfDay({
        amount: cashTotal,
        description: `Gün Sonu Nakit Tahsilat - ${dateStr}`,
        category: 'Gün Sonu',
        paymentMethod: 'KASA',
        userId,
      });
    }

    if (cardTotal > 0) {
      await this.financeService.upsertEndOfDay({
        amount: cardTotal,
        description: `Gün Sonu Kredi Kartı Tahsilat - ${dateStr}`,
        category: 'Gün Sonu',
        paymentMethod: 'KREDI_KARTI',
        userId,
      });
    }

    if (bankTotal > 0) {
      await this.financeService.upsertEndOfDay({
        amount: bankTotal,
        description: `Gün Sonu Banka Tahsilat - ${dateStr}`,
        category: 'Gün Sonu',
        paymentMethod: 'BANKA',
        userId,
      });
    }

    // Satışları kapatıldı olarak işaretle
    const saleIds = sales.map(s => s.id);
    await this.saleRepository.createQueryBuilder()
      .update(Sale)
      .set({ isEndOfDayClosed: true })
      .whereInIds(saleIds)
      .execute();

    const grandTotal = cashTotal + cardTotal + bankTotal;

    // Bildirim tetikle (Manuel ve Otomatik Ortak)
    this.alertsService.trigger('END_OF_DAY', {
      triggerUserId: userId,
      description: `Gün Sonu Kapatıldı. Toplam Hasılat: ₺${grandTotal}`,
      numericValue: grandTotal,
    }).catch(() => {});

    return {
      date: dateStr,
      cashTotal,
      cardTotal,
      bankTotal,
      grandTotal,
    };
  }

  async cancelTableOrders(tableId: number): Promise<void> {
    await this.saleRepository.manager.transaction(async (manager) => {
      await manager.update(Sale,
        { tableId, status: In(['NEW', 'PREPARATION', 'READY', 'SERVED']) },
        { status: 'CANCELLED' }
      );
      const table = await manager.findOne(Table, { where: { id: tableId, isDeleted: false } });
      if (table) {
        await manager.update(Table, tableId, {
          status: 'BOŞ',
          waiterName: '',
          currentTotal: 0,
          orderStartTime: () => 'NULL',
        });
      }
    });

    // Bildirim tetikle
    this.alertsService.trigger('SALE_CANCELLED', {
      tableId,
      description: `Masa #${tableId} adisyonu iptal edildi.`,
    }).catch(() => {});
  }

  async cancelItem(itemId: number, reason: string, userId: number): Promise<SaleItem> {
    const item = await this.saleItemRepository.findOne({
      where: { id: itemId },
      relations: ['sale', 'sale.table'],
    });
    if (!item) throw new NotFoundException('Ürün bulunamadı.');
    if (item.isMarshed) {
      throw new BadRequestException('Bu ürün mutfağa gönderilmiştir. İptal yerine iade işlemi yapınız.');
    }

    item.status = 'CANCELLED';
    item.cancelReason = reason;
    (item as any).cancelledByUserId = userId;

    const updated = await this.saleItemRepository.save(item);

    // Stok geri alımı (varsa)
    try {
      const stockParam = await this.saleRepository.query(`
        SELECT value FROM system_parameters WHERE [module] = 'pos' AND [key] = 'cancel_stock_reverse'
      `);
      if (stockParam[0]?.value === 'true') {
        await this.stocksService.deductStock(item.productId, -Number(item.quantity));
      }
    } catch { /* parametre yoksa atla */ }

    // Denetim logu
    try {
      await this.saleRepository.query(`
        INSERT INTO audit_logs (timestamp, userId, actionType, saleId, productName, amount, description, companyId)
        VALUES (GETDATE(), @0, 'ITEM_CANCEL', @1, @2, @3, @4, 1)
      `, [userId, item.sale?.id, `Ürün #${item.productId}`, item.total, reason || 'İptal edildi']);
    } catch { /* audit log hatası sessizce geç */ }

    this.kitchenGateway.notifySaleUpdate(item.sale as any);
    return updated;
  }

  async refundItem(itemId: number, reason: string, userId: number): Promise<SaleItem> {
    const item = await this.saleItemRepository.findOne({
      where: { id: itemId },
      relations: ['sale', 'sale.table'],
    });
    if (!item) throw new NotFoundException('Ürün bulunamadı.');

    item.status = 'REFUNDED';
    item.refundReason = reason;
    (item as any).refundedByUserId = userId;

    const updated = await this.saleItemRepository.save(item);

    // Denetim logu
    try {
      await this.saleRepository.query(`
        INSERT INTO audit_logs (timestamp, userId, actionType, saleId, productName, amount, description, companyId)
        VALUES (GETDATE(), @0, 'ITEM_REFUND', @1, @2, @3, @4, 1)
      `, [userId, item.sale?.id, `Ürün #${item.productId}`, item.total, reason || 'İade edildi']);
    } catch { /* audit log hatası sessizce geç */ }

    // KDS/Yazıcıya iade bildirimi
    this.kitchenGateway.server.emit('itemRefunded', {
      itemId: item.id,
      saleId: item.sale?.id,
      tableName: item.sale?.tableName,
      productId: item.productId,
      status: 'REFUNDED',
    });

    return updated;
  }

  async refundSale(saleId: number, reason: string, userId: number): Promise<Sale> {
    const sale = await this.findOne(saleId);
    if (!sale) throw new NotFoundException('Satış bulunamadı.');

    sale.status = 'CANCELLED';
    (sale as any).refundReason = reason;
    (sale as any).refundedAt = new Date();
    (sale as any).refundedByUserId = userId;
    (sale as any).refundAmount = sale.totalAmount;

    const updated = await this.saleRepository.save(sale);

    // Tüm kalemleri iade et
    if (sale.items?.length) {
      await this.saleItemRepository.update(
        sale.items.map(i => i.id),
        { status: 'REFUNDED', refundReason: reason, refundedByUserId: userId } as any,
      );
    }

    // Denetim logu
    try {
      await this.saleRepository.query(`
        INSERT INTO audit_logs (timestamp, userId, actionType, saleId, tableNo, amount, description, companyId)
        VALUES (GETDATE(), @0, 'SALE_REFUND', @1, @2, @3, @4, 1)
      `, [userId, saleId, sale.tableName, sale.totalAmount, reason || 'Tam adisyon iadesi']);
    } catch { /* sessizce geç */ }

    this.kitchenGateway.notifySaleUpdate(updated as any);
    return updated;
  }

  private async deductStockForSale(sale: Sale, manager: any): Promise<void> {
    const items = sale.items;
    if (!items || items.length === 0) return;

    const productIds = Array.from(new Set(items.map(i => i.productId).filter(Boolean)));
    if (productIds.length === 0) return;

    const allRecipes = await manager.getRepository(Recipe).find({
      where: { productId: In(productIds) },
      relations: ['ingredient']
    });

    const recipeMap = new Map<number, Recipe[]>();
    allRecipes.forEach((r: Recipe) => {
      const list = recipeMap.get(r.productId) || [];
      list.push(r);
      recipeMap.set(r.productId, list);
    });

    const deductions = new Map<number, number>();
    const itemCostMap = new Map<number, number>();

    for (const item of items) {
      const productId = item.productId;
      if (!productId) continue;

      const recipes = recipeMap.get(productId) || [];
      let totalCost = 0;

      if (recipes.length > 0) {
        for (const recipe of recipes) {
          const qty = Number(recipe.quantity) * Number(item.quantity);
          deductions.set(recipe.ingredientId, (deductions.get(recipe.ingredientId) || 0) + qty);
          const ingredientCost = Number(recipe.ingredient?.costPrice || recipe.ingredient?.price || 0);
          totalCost += ingredientCost * Number(recipe.quantity);
        }
      } else {
        deductions.set(productId, (deductions.get(productId) || 0) + Number(item.quantity));
        const rawProduct = await manager.query(`SELECT costPrice FROM products WHERE id = ${productId}`);
        totalCost = Number(rawProduct[0]?.costPrice || 0);
      }
      itemCostMap.set(item.id, totalCost);
    }

    for (const [id, qty] of deductions.entries()) {
      await this.stocksService.deductStock(id, qty, undefined, manager);
    }

    for (const [itemId, cost] of itemCostMap.entries()) {
      await manager.getRepository(SaleItem).update(itemId, { costPrice: cost });
    }
  }
}

