import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
  private async mapProductsToSales(sales: Sale[]): Promise<Sale[]> {
    if (sales.length === 0) return sales;
    const saleItemIds = sales.flatMap(s => s.items?.map(i => i.id) || []);

    if (saleItemIds.length > 0) {
      const rawProducts: any[] = await this.saleRepository.query(`
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
      relations: ['items', 'table', 'waiter'],
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
    return updated;
  }

  async create(saleData: Partial<Sale>): Promise<Sale> {
    try {
      const { items, ...data } = saleData;

      // Handle Partner (Customer) default
      if (!data.partnerId) {
        const retailPartner = await this.partnersService.getOrCreateRetailCustomer();
        data.partnerId = retailPartner.id;
      }

      const newSale = this.saleRepository.create(data);
      let savedSale = await this.saleRepository.save(newSale);

      if (items && items.length > 0) {
        for (const item of items) {
          const saleItem = this.saleItemRepository.create({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice || 0,
            total: item.total || (item.quantity * item.unitPrice),
            note: item.note,
            isWaiting: item.isWaiting || false,
            isMarshed: false,
            sale: savedSale,
          });
          await this.saleItemRepository.save(saleItem);
        }
      }

      // Record in finance if COMPLETED
      if (savedSale.status === 'COMPLETED') {
        await this.financeService.create({
          amount: savedSale.totalAmount,
          type: 'INCOME',
          description: `Masa/Satış Ödemesi - Satış #${savedSale.id} ${savedSale.tableName ? `(${savedSale.tableName})` : ''}`,
          sourceType: 'SALE',
          sourceId: savedSale.id,
          paymentMethod: savedSale.paymentMethod || 'KASA',
          category: 'Satış',
          partnerId: savedSale.partnerId,
        });
      }

      // Table Status update
      if (data.tableId) {
        const table = await this.saleRepository.manager.findOne(Table, { where: { id: data.tableId } });
        if (table) {
          const waiter = await this.saleRepository.manager.findOne(User, { where: { id: data.waiterId || data.userId } });
          await this.saleRepository.manager.update(Table, data.tableId, {
            status: savedSale.status === 'COMPLETED' ? 'BOŞ' : 'DOLU',
            waiterName: savedSale.status === 'COMPLETED' ? '' : (waiter ? `${waiter.firstName} ${waiter.lastName}` : (table.waiterName || 'Sistem')),
            currentTotal: savedSale.status === 'COMPLETED' ? 0 : (Number(table.currentTotal || 0) + Number(savedSale.totalAmount)),
            orderStartTime: table.status === 'BOŞ' ? new Date() : (savedSale.status === 'COMPLETED' ? null as any : table.orderStartTime),
          });
        }
      }

      // Stock deduction
      await this.deductStockForSale(savedSale.id);

      const fullSales = await this.mapProductsToSales([savedSale]);
      const fullSale = fullSales[0];

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
      relations: ['sale']
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

    return updated;
  }

  async payItem(itemId: number, paymentMethod: string, partnerId?: number): Promise<void> {
    return this.payBatchItems([itemId], paymentMethod, partnerId);
  }

  async payBatchItems(itemIds: number[], paymentMethod: string, partnerId?: number): Promise<void> {
    if (!itemIds || itemIds.length === 0) return;

    await this.saleRepository.manager.transaction(async (manager) => {
      const items = await manager.find(SaleItem, {
        where: { id: In(itemIds) },
        relations: ['sale', 'sale.table']
      });
      if (items.length === 0) return;

      for (const item of items) {
        if (!item.isPaid) {
          item.isPaid = true;
          await manager.save(SaleItem, item);

          // Update Table currentTotal decrease by item total.
          if (item.sale && item.sale.table) {
            const table = await manager.findOne(Table, { where: { id: item.sale.table.id } });
            if (table) {
               table.currentTotal = Math.max(0, Number(table.currentTotal || 0) - Number(item.total || (item.unitPrice * item.quantity)));
               await manager.save(Table, table);
            }
          }

          // Finance kaydı
          await this.financeService.create({
            amount: item.total || (item.unitPrice * item.quantity),
            type: 'INCOME',
            description: `Satış Kalemi Ödemesi - Kalem #${item.id}`,
            sourceType: 'SALE_ITEM',
            sourceId: item.id,
            paymentMethod: paymentMethod || 'KASA',
            category: 'Satış',
            partnerId: partnerId,
          });
        }
      }
    });

    this.kitchenGateway.notifySaleUpdate({ type: 'BATCH_PAYMENT', itemIds });
  }

  async getKitchenOrders(status?: string): Promise<Sale[]> {
    const statuses = status ? [status] : ['NEW', 'PREPARATION'];
    const sales = await this.saleRepository.createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('sale.table', 'table')
      .leftJoinAndSelect('sale.waiter', 'waiter')
      .where('sale.status IN (:...statuses)', { statuses })
      .andWhere('sale.tableId IS NOT NULL')
      .orderBy(status === 'READY' ? 'sale.updatedAt' : 'sale.createdAt', status === 'READY' ? 'DESC' : 'ASC')
      .getMany();

    return this.mapProductsToSales(sales);
  }

  async getKitchenCounts(): Promise<{ pending: number; finished: number; total: number }> {
    const pending = await this.saleRepository.count({
      where: [
        { status: 'NEW' as any },
        { status: 'PREPARATION' as any },
      ],
    });
    const finished = await this.saleRepository.count({ where: { status: 'READY' as any } });
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

    // Finans kayıtlarını oluştur
    if (cashTotal > 0) {
      await this.financeService.create({
        amount: cashTotal,
        type: 'INCOME',
        description: `Gün Sonu Nakit Tahsilat - ${dateStr}`,
        sourceType: 'END_OF_DAY',
        category: 'Gün Sonu',
        paymentMethod: 'KASA',
        userId,
      });
    }

    if (cardTotal > 0) {
      await this.financeService.create({
        amount: cardTotal,
        type: 'INCOME',
        description: `Gün Sonu Kredi Kartı Tahsilat - ${dateStr}`,
        sourceType: 'END_OF_DAY',
        category: 'Gün Sonu',
        paymentMethod: 'KREDI_KARTI',
        userId,
      });
    }

    if (bankTotal > 0) {
      await this.financeService.create({
        amount: bankTotal,
        type: 'INCOME',
        description: `Gün Sonu Banka Tahsilat - ${dateStr}`,
        sourceType: 'END_OF_DAY',
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

    return {
      date: dateStr,
      cashTotal,
      cardTotal,
      bankTotal,
      grandTotal: cashTotal + cardTotal + bankTotal,
    };
  }

  async cancelTableOrders(tableId: number): Promise<void> {
    await this.saleRepository.manager.transaction(async (manager) => {
      await manager.update(Sale,
        { tableId, status: In(['NEW', 'PREPARATION', 'READY', 'SERVED']) },
        { status: 'CANCELLED' }
      );
      const table = await manager.findOne(Table, { where: { id: tableId } });
      if (table) {
        await manager.update(Table, tableId, {
          status: 'BOŞ',
          waiterName: '',
          currentTotal: 0,
          orderStartTime: () => 'NULL',
        });
      }
    });
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.saleRepository.delete(id);
  }

  private async deductStockForSale(saleId: number): Promise<void> {
    const sale = await this.findOne(saleId);
    for (const item of sale.items) {
      const productId = item.productId;
      if (!productId) continue;

      const recipes = await this.recipesService.findByProduct(productId);
      let totalCost = 0;

      if (recipes.length > 0) {
        for (const recipe of recipes) {
          const deductQty = Number(recipe.quantity) * Number(item.quantity);
          await this.stocksService.deductStock(recipe.ingredientId, deductQty);
          const ingredientCost = Number(recipe.ingredient?.costPrice || recipe.ingredient?.price || 0);
          totalCost += ingredientCost * Number(recipe.quantity);
        }
      } else {
        await this.stocksService.deductStock(productId, Number(item.quantity));
        const prod = (item as any).product;
        totalCost = Number(prod?.costPrice || 0);
      }
      await this.saleItemRepository.update(item.id, { costPrice: totalCost });
    }
  }
}
