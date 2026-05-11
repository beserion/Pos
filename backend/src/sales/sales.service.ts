import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Recipe } from '../recipes/recipe.entity';
import { Sale } from './sale.entity';
import { SaleItem } from './sale-item.entity';
import { TransferLog } from './transfer-log.entity';
import { RecipesService } from '../recipes/recipes.service';
import { StocksService } from '../stocks/stocks.service';
import { Table } from '../tables/table.entity';
import { User } from '../users/user.entity';
import { KitchenGateway } from '../orders/kitchen.gateway';
import { FinanceService } from '../finance/finance.service';
import { PartnersService } from '../partners/partners.service';
import { PrintersService } from '../printers/printers.service';
import { AlertsService } from '../alerts/alerts.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { ProductsService } from '../products/products.service';
import { TablesService } from '../tables/tables.service';
import { ParametersService } from '../parameters/parameters.service';
import { getCachedPerms } from '../auth/permissions.guard';
import { InposService } from '../inpos/inpos.service';
import { InposPaymentType, InposUnit } from '../inpos/inpos.types';
import { BusinessDayService } from '../reports/business-day.service';
import type { InposSaleItemData, InposPaymentInfo } from '../inpos/inpos.types';

@Injectable()
export class SalesService implements OnModuleInit {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private saleItemRepository: Repository<SaleItem>,
    @InjectRepository(TransferLog)
    private transferLogRepository: Repository<TransferLog>,
    private recipesService: RecipesService,
    private stocksService: StocksService,
    private kitchenGateway: KitchenGateway,
    private financeService: FinanceService,
    private partnersService: PartnersService,
    private printersService: PrintersService,
    private alertsService: AlertsService,
    private stockMovementsService: StockMovementsService,
    private productsService: ProductsService,
    private tablesService: TablesService,
    private inposService: InposService,
    private parametersService: ParametersService,
    private businessDayService: BusinessDayService,
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

      const productsTable = await queryRunner.getTable('products');
      if (productsTable && !productsTable.columns.find(c => c.name === 'staffPrice')) {
        this.logger.log('Adding staffPrice column to products table...');
        await queryRunner.addColumn('products', {
          name: 'staffPrice',
          type: 'decimal',
          precision: 10,
          scale: 2,
          isNullable: true,
          default: 0
        } as any);
      }

      const tablesTable = await queryRunner.getTable('tables');
      if (tablesTable && !tablesTable.columns.find(c => c.name === 'waiterId')) {
        this.logger.log('Adding waiterId column to tables table...');
        await queryRunner.addColumn('tables', {
          name: 'waiterId',
          type: 'int',
          isNullable: true,
          default: null
        } as any);
      }

      if (tablesTable && !tablesTable.columns.find(c => c.name === 'tempName')) {
        this.logger.log('Adding tempName column to tables table...');
        await queryRunner.addColumn('tables', {
          name: 'tempName',
          type: 'nvarchar',
          length: '100',
          isNullable: true,
          default: null
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

        if (!itemsTable.columns.find(c => c.name === 'transactionType')) {
          this.logger.log('Adding transactionType column to sale_items table...');
          await queryRunner.addColumn('sale_items', {
            name: 'transactionType',
            type: 'nvarchar',
            length: '20',
            isNullable: false,
            default: "'SALE'"
          } as any);
        }

        if (!itemsTable.columns.find(c => c.name === 'transactionReason')) {
          this.logger.log('Adding transactionReason column to sale_items table...');
          await queryRunner.addColumn('sale_items', {
            name: 'transactionReason',
            type: 'nvarchar',
            length: '500',
            isNullable: true,
            default: null
          } as any);
        }
      }

      // --- Alt Adisyon (Sub-Check) sütunları ---
      if (table && !table.columns.find(c => c.name === 'parentSaleId')) {
        this.logger.log('Adding parentSaleId column to sales table...');
        await queryRunner.addColumn('sales', {
          name: 'parentSaleId',
          type: 'int',
          isNullable: true,
          default: null
        } as any);
      }
      if (table && !table.columns.find(c => c.name === 'subCheckLabel')) {
        this.logger.log('Adding subCheckLabel column to sales table...');
        await queryRunner.addColumn('sales', {
          name: 'subCheckLabel',
          type: 'nvarchar',
          length: '100',
          isNullable: true,
          default: null
        } as any);
      }
      if (table && !table.columns.find(c => c.name === 'subCheckIndex')) {
        this.logger.log('Adding subCheckIndex column to sales table...');
        await queryRunner.addColumn('sales', {
          name: 'subCheckIndex',
          type: 'int',
          isNullable: false,
          default: 0
        } as any);
      }

      // --- Transfer Alanları (Sale) ---
      if (table && !table.columns.find(c => c.name === 'transferredFromTableId')) {
        this.logger.log('Adding transferredFromTableId column to sales table...');
        await queryRunner.addColumn('sales', { name: 'transferredFromTableId', type: 'int', isNullable: true, default: null } as any);
      }
      if (table && !table.columns.find(c => c.name === 'transferredFromTableName')) {
        await queryRunner.addColumn('sales', { name: 'transferredFromTableName', type: 'nvarchar', length: '100', isNullable: true, default: null } as any);
      }
      if (table && !table.columns.find(c => c.name === 'transferCode')) {
        await queryRunner.addColumn('sales', { name: 'transferCode', type: 'nvarchar', length: '50', isNullable: true, default: null } as any);
      }
      if (table && !table.columns.find(c => c.name === 'createdByUserId')) {
        await queryRunner.addColumn('sales', { name: 'createdByUserId', type: 'int', isNullable: true, default: null } as any);
      }
      if (table && !table.columns.find(c => c.name === 'transferredByUserId')) {
        await queryRunner.addColumn('sales', { name: 'transferredByUserId', type: 'int', isNullable: true, default: null } as any);
      }
      if (table && !table.columns.find(c => c.name === 'lastUpdatedByUserId')) {
        await queryRunner.addColumn('sales', { name: 'lastUpdatedByUserId', type: 'int', isNullable: true, default: null } as any);
      }

      // --- Set Menü / Fix Menü Hazırlık Alanları (SaleItem) ---
      if (itemsTable && !itemsTable.columns.find(c => c.name === 'parentItemId')) {
        this.logger.log('Adding parentItemId column to sale_items table...');
        await queryRunner.addColumn('sale_items', { name: 'parentItemId', type: 'int', isNullable: true, default: null } as any);
      }
      if (itemsTable && !itemsTable.columns.find(c => c.name === 'menuGroupId')) {
        this.logger.log('Adding menuGroupId column to sale_items table...');
        await queryRunner.addColumn('sale_items', { name: 'menuGroupId', type: 'nvarchar', length: '50', isNullable: true, default: null } as any);
      }
      
      // --- Satış Tipi (Yarım / Duble) ---
      if (itemsTable && !itemsTable.columns.find(c => c.name === 'saleType')) {
        this.logger.log('Adding saleType column to sale_items table...');
        await queryRunner.addColumn('sale_items', { name: 'saleType', type: 'nvarchar', length: '20', isNullable: false, default: "'STANDARD'" } as any);
      }
      if (itemsTable && !itemsTable.columns.find(c => c.name === 'saleTypeMultiplier')) {
        this.logger.log('Adding saleTypeMultiplier column to sale_items table...');
        await queryRunner.addColumn('sale_items', { name: 'saleTypeMultiplier', type: 'decimal', precision: 5, scale: 2, isNullable: false, default: 1.00 } as any);
      }

      // --- Kim Ekledi / Ne Zaman (SaleItem) ---
      if (itemsTable && !itemsTable.columns.find(c => c.name === 'addedByUserId')) {
        this.logger.log('Adding addedByUserId column to sale_items table...');
        await queryRunner.addColumn('sale_items', { name: 'addedByUserId', type: 'int', isNullable: true, default: null } as any);
      }
      if (itemsTable && !itemsTable.columns.find(c => c.name === 'addedAt')) {
        this.logger.log('Adding addedAt column to sale_items table...');
        await queryRunner.addColumn('sale_items', { name: 'addedAt', type: 'datetime2', isNullable: true, default: null } as any);
      }

      // transfer_logs tablosu synchronize: true tarafından otomatik oluşturulur

      await queryRunner.release();
    } catch (error) {
      this.logger.error('Error ensuring schema for sales tables:', error);
    }
  }

  async applyDiscount(saleId: number, discountAmount: number, userId: number): Promise<Sale> {
    const cached = getCachedPerms(userId);
    const up = cached?.allUserPerms || [];
    const isSuper = cached?.roleName === 'ADMIN' || cached?.roleName === 'ADMINISTRATOR';

    if (!isSuper) {
      const hasLimit = up.some(p => p.startsWith('DISCOUNT_LIMIT:'));
      if (!up.includes('OP:CAN_DISCOUNT') && !hasLimit) {
        throw new BadRequestException('İndirim yapma yetkiniz bulunmamaktadır.');
      }

      // Limit Check
      const discLimitStr = up.find(p => p.startsWith('DISCOUNT_LIMIT:'));

      const limit = discLimitStr ? parseInt(discLimitStr.split(':')[1]) : 0;
      
      if (limit > 0) {
        const sale = await this.saleRepository.findOne({ where: { id: saleId }, relations: ['items'] });
        if (!sale) throw new NotFoundException('Adisyon bulunamadı');

        const subTotal = sale.items?.reduce((sum, i) => sum + (Number(i.unitPrice) * Number(i.quantity)), 0) || 0;
        const requestedRate = subTotal > 0 ? (discountAmount / subTotal) * 100 : 0;

        if (requestedRate > limit) {
          throw new BadRequestException(`İndirim limitinizi (%${limit}) aştınız.`);
        }
      }
    }

    return await this.saleRepository.manager.transaction(async (manager) => {
      const sale = await manager.findOne(Sale, { where: { id: saleId }, relations: ['items', 'table'] });
      if (!sale) throw new NotFoundException('Adisyon bulunamadı');

      const oldDiscount = Number(sale.discountAmount || 0);
      const diff = discountAmount - oldDiscount;
      
      sale.discountAmount = discountAmount;
      sale.totalAmount = Number(sale.totalAmount) - diff;
      
      const saved = await manager.save(Sale, sale);

      // Update Table total if it's an active table
      if (sale.tableId) {
        const table = await manager.findOne(Table, { where: { id: sale.tableId } });
        if (table) {
          table.currentTotal = Number(table.currentTotal) - diff;
          await manager.save(Table, table);
        }
      }

      // Audit Log
      try {
        await manager.query(`
          INSERT INTO audit_logs (timestamp, userId, actionType, saleId, tableNo, amount, description, companyId)
          VALUES (GETDATE(), @0, 'DISCOUNT', @1, @2, @3, @4, @5)
        `, [userId, sale.id, sale.tableName, discountAmount, `İndirim uygulandı: ₺${discountAmount}`, sale.companyId || 1]);
      } catch {}

      this.kitchenGateway.notifySaleUpdate(saved);
      this.tablesService.clearCache();
      
      return saved;
    });
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
          const businessDateStr = startDate.split('T')[0];
          query.andWhere('(sale.businessDate >= :businessStartDate OR (sale.businessDate IS NULL AND sale.createdAt >= :startDate))', { 
            businessStartDate: businessDateStr,
            startDate: start 
          });
        }
      }

      if (endDate && endDate.trim() !== '') {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          const businessDateStr = endDate.split('T')[0];
          query.andWhere('(sale.businessDate <= :businessEndDate OR (sale.businessDate IS NULL AND sale.createdAt <= :endDate))', { 
            businessEndDate: businessDateStr,
            endDate: endOfDay 
          });
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
      relations: ['items', 'table', 'table.zone', 'waiter', 'subChecks', 'subChecks.items', 'parentSale'],
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }
    const mapped = await this.mapProductsToSales([sale]);
    return mapped[0];
  }

  async restoreSale(id: number, userId: number): Promise<Sale> {
    return await this.saleRepository.manager.transaction(async (manager) => {
      const sale = await manager.findOne(Sale, {
        where: { id },
        relations: ['items', 'table']
      });

      if (!sale) throw new NotFoundException('Satış bulunamadı');
      if (sale.status !== 'COMPLETED' && sale.status !== 'PAID') {
        throw new BadRequestException('Sadece tamamlanmış satışlar geri yüklenebilir.');
      }
      if (sale.isEndOfDayClosed) {
        throw new BadRequestException('Gün sonu alınmış satışlar geri yüklenemez.');
      }

      // Update sale
      sale.status = 'SERVED'; // Active status
      sale.paymentMethod = null as any;
      sale.paidAmountCash = 0;
      sale.paidAmountCreditCard = 0;

      await manager.save(Sale, sale);

      // Update items
      if (sale.items && sale.items.length > 0) {
        await manager.update(SaleItem, { sale: { id: sale.id } }, { isPaid: false });
      }

      // Update Table
      if (sale.tableId) {
        const table = await manager.findOne(Table, { where: { id: sale.tableId } });
        if (table) {
          const newTotal = Number(table.currentTotal || 0) + Number(sale.totalAmount || 0);
          await manager.update(Table, sale.tableId, {
            status: 'DOLU',
            currentTotal: newTotal,
            orderStartTime: table.status === 'BOŞ' ? new Date() : table.orderStartTime,
            isBillRequested: false
          });
        }
      }

      // Re-fetch mapped
      const refreshedSale = await manager.findOne(Sale, {
        where: { id: sale.id },
        relations: ['items', 'table', 'table.zone', 'waiter']
      });
      const mapped = await this.mapProductsToSales([refreshedSale as Sale], manager);

      // Auditing
      try {
        await manager.query(`
          INSERT INTO audit_logs (timestamp, userId, actionType, saleId, tableNo, amount, description, companyId)
          VALUES (GETDATE(), @0, 'RESTORE_SALE', @1, @2, @3, @4, @5)
        `, [userId, sale.id, sale.tableName, sale.totalAmount, 'Satış masaya geri yüklendi', sale.companyId || 1]);
      } catch {}

      // Notifications
      this.kitchenGateway.notifySaleUpdate(mapped[0]);
      this.tablesService.clearCache();

      return mapped[0];
    });
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

  async create(saleData: Partial<Sale>, addedByUserId: number = 0): Promise<Sale> {
    if (addedByUserId) {
        const cached = getCachedPerms(addedByUserId);
        const isSuper = cached?.roleName === 'ADMIN' || cached?.roleName === 'ADMINISTRATOR';
        
        if (!isSuper) {
            const up = cached?.allUserPerms || [];
            const hasOrderPerm = up.includes('OP:CAN_ORDER');
            const hasPaymentPerm = up.includes('OP:FINANCE_CLOSE_ACCOUNT');
            const isCompleted = saleData.status === 'COMPLETED';

            // Sipariş alma yetkisi yoksa ve (işlem bir ödeme kapatma değilse VEYA ödeme kapatma yetkisi de yoksa) engelle
            if (!hasOrderPerm && !(isCompleted && hasPaymentPerm)) {
                throw new BadRequestException('Sipariş alma veya ödeme kapatma yetkiniz bulunmamaktadır.');
            }
        }
    }

    return await this.saleRepository.manager.transaction(async (manager) => {
      try {
        const { items, ...dataRaw } = saleData;
        const mergeSaleIds = (dataRaw as any).mergeSaleIds;
        delete (dataRaw as any).mergeSaleIds;
        const data = dataRaw;

        (data as any).tableId = data.tableId || null;
        (data as any).shiftId = data.shiftId || null;
        (data as any).cashRegisterId = data.cashRegisterId || null;
        (data as any).waiterId = data.waiterId || data.userId || addedByUserId || null;
        (data as any).userId = data.userId || addedByUserId || null;
        (data as any).partnerId = data.partnerId || null;

        // Handle Partner (Customer) default
        if (!data.partnerId) {
          const retailPartner = await this.partnersService.getOrCreateRetailCustomer();
          data.partnerId = retailPartner.id;
        }

        const activeDate = await this.businessDayService.getActiveBusinessDate();
        (data as any).businessDate = activeDate;

        const newSale = manager.create(Sale, data);
        const savedSale = await manager.save(Sale, newSale);

        // Security / Permission Checks
        if (addedByUserId) {
          const cached = getCachedPerms(addedByUserId);
          const isSuper = cached?.roleName === 'ADMIN' || cached?.roleName === 'ADMINISTRATOR';

          if (!isSuper) {
            const up = cached?.allUserPerms || [];
            const table = data.tableId ? await manager.findOne(Table, { where: { id: data.tableId } }) : null;
            const isBillRequested = table?.isBillRequested || false;

            // 1. Discount Check
            if (Number(data.discountAmount || 0) > 0) {
              if (!up.includes('OP:CAN_DISCOUNT')) {
                throw new BadRequestException('İndirim yapma yetkiniz bulunmamaktadır.');
              }
              if (isBillRequested && !up.includes('OP:DISCOUNT_AFTER_BILL')) {
                throw new BadRequestException('Hesabı istenmiş adisyonda indirim yapma yetkiniz bulunmamaktadır.');
              }

              // Limit Check
              const discLimitStr = up.find(p => p.startsWith('DISCOUNT_LIMIT:'));
              const limit = discLimitStr ? parseInt(discLimitStr.split(':')[1]) : 0;
              if (limit > 0) {
                const subTotalForLimit = items?.reduce((sum, i: any) => sum + (Number(i.unitPrice || 0) * Number(i.quantity || 0)), 0) || 0;
                const requestedRate = subTotalForLimit > 0 ? (Number(data.discountAmount) / subTotalForLimit) * 100 : 0;

                if (requestedRate > limit) {
                  // Trigger Alert
                  const waiterUser = await manager.findOne(User, { where: { id: addedByUserId } });
                  this.alertsService.trigger('DISCOUNT_LIMIT_VIOLATION', {
                    triggerUserId: addedByUserId,
                    triggerUserName: waiterUser ? `${waiterUser.firstName} ${waiterUser.lastName}` : 'Kullanıcı',
                    tableName: table?.name || data.tableName,
                    description: `Limit Aşımı: %${requestedRate.toFixed(1)} indirim talep edildi (Kullanıcı limiti: %${limit}). Masa: ${table?.name || '-'}`,
                    numericValue: requestedRate,
                  }).catch(() => {});

                  throw new BadRequestException(`İndirim limitinizi (%${limit}) aştınız. Sizin için %${requestedRate.toFixed(1)} talep edildi.`);
                }
              }
            }

            // 2. Complimentary (İkram) Check
            if (Number(data.totalAmount || 0) === 0 && (items?.length || 0) > 0) {
              if (!up.includes('OP:CAN_COMPLIMENTARY')) {
                throw new BadRequestException('İkram yapma yetkiniz bulunmamaktadır.');
              }
            }
          }
        }

        if (items && items.length > 0) {
          const saleItems: SaleItem[] = [];
          for (const item of items as any[]) {
            let rawSetMenu = null;
            if (!item.subItems || item.subItems.length === 0) {
              const rawProducts = await manager.query(`SELECT isSet FROM products WHERE id = ${item.productId}`);
              if (rawProducts[0]?.isSet) {
                 rawSetMenu = await manager.query(`SELECT id, setType FROM set_menus WHERE productId = ${item.productId}`);
              }
            }

            // Price Change Security Check
            if (addedByUserId) {
              const cached = getCachedPerms(addedByUserId);
              const isSuper = cached?.roleName === 'ADMIN' || cached?.roleName === 'ADMINISTRATOR';
              if (!isSuper) {
                const up = cached?.allUserPerms || [];
                const product = await manager.query(`SELECT price FROM products WHERE id = ${item.productId}`);
                const originalPrice = product[0]?.price || 0;
                
                if (Number(item.unitPrice) !== Number(originalPrice)) {
                  if (!up.includes('OP:CAN_CHANGE_PRICE')) {
                    throw new BadRequestException(`${item.productId} ID'li ürünün fiyatını değiştirme yetkiniz bulunmamaktadır.`);
                  }
                  const table = data.tableId ? await manager.findOne(Table, { where: { id: data.tableId } }) : null;
                  if (table?.isBillRequested && !up.includes('OP:PRICE_AFTER_BILL')) {
                     throw new BadRequestException('Hesabı istenmiş masada fiyat değiştirme yetkiniz bulunmamaktadır.');
                  }
                }
              }
            }

            const tType = item.transactionType || 'SALE';
            const tReason = item.transactionReason || null;
            
            // İşlem Tipi Yetki Kontrolleri
            if (addedByUserId && tType !== 'SALE') {
              const cached = getCachedPerms(addedByUserId);
              const up = cached?.allUserPerms || [];
              const isSuper = cached?.roleName === 'ADMIN' || cached?.roleName === 'ADMINISTRATOR';
              
              if (!isSuper) {
                if (tType === 'COMPLIMENTARY' && !up.includes('OP:CAN_COMPLIMENTARY')) throw new BadRequestException('İkram yapma yetkiniz bulunmamaktadır.');
                if (tType === 'FREE' && !up.includes('OP:NON_PAYMENT')) throw new BadRequestException('Bedelsiz işlem yapma yetkiniz bulunmamaktadır.');
                if (tType === 'PROMOTION' && !up.includes('OP:CAN_PROMOTION')) throw new BadRequestException('Promosyon uygulama yetkiniz bulunmamaktadır.');
                if (tType === 'STAFF' && !up.includes('OP:STAFF_SALE')) throw new BadRequestException('Personel satışı yapma yetkiniz bulunmamaktadır.');
                if (tType === 'TICKET' && !up.includes('OP:CAN_TICKET')) throw new BadRequestException('Bilet işlemi yapma yetkiniz bulunmamaktadır.');
              }
            }

            let finalUnitPrice = Number(item.unitPrice);
            if (['COMPLIMENTARY', 'FREE', 'TICKET'].includes(tType)) {
              finalUnitPrice = 0;
            } else if (tType === 'STAFF') {
              const prod = await manager.query(`SELECT staffPrice, price FROM products WHERE id = ${item.productId}`);
              if (prod && prod.length > 0) {
                finalUnitPrice = (prod[0].staffPrice && Number(prod[0].staffPrice) > 0) ? Number(prod[0].staffPrice) : Number(prod[0].price);
              }
            }

            const parentItem = manager.create(SaleItem, {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: finalUnitPrice,
              transactionType: tType,
              transactionReason: tReason,
              saleType: item.saleType || 'STANDARD',
              saleTypeMultiplier: item.saleTypeMultiplier || 1.00,
              costPrice: item.costPrice || 0,
              total: item.total || (Number(item.quantity) * finalUnitPrice),
              note: item.note,
              isWaiting: item.isWaiting || false,
              isMarshed: false,
              sale: savedSale,
              isPaid: savedSale.status === 'COMPLETED',
              addedByUserId: addedByUserId || (data as any).waiterId || (data as any).userId || undefined,
              addedAt: new Date(),
            });
            const savedParent = await manager.save(SaleItem, parentItem);
            saleItems.push(savedParent);

            if (item.subItems && item.subItems.length > 0) {
              const isMerging = Boolean(mergeSaleIds && mergeSaleIds.length > 0);
              for (const subItem of item.subItems) {
                // Ekstra (alt ürün) miktarı arayüzden gönderildiği şekliyle mutlak (absolute) olarak alınır, ana ürünle çarpılmaz.
                const finalSubQty = Number(subItem.quantity);
                const finalSubUnitPrice = Number(subItem.unitPrice || 0);
                const finalSubTotal = isMerging ? (subItem.total || (finalSubUnitPrice * finalSubQty)) : (finalSubUnitPrice * finalSubQty);

                const newSub = manager.create(SaleItem, {
                  productId: subItem.productId,
                  quantity: finalSubQty,
                  unitPrice: finalSubUnitPrice,
                  saleType: item.saleType || 'STANDARD',
                  saleTypeMultiplier: item.saleTypeMultiplier || 1.00,
                  costPrice: subItem.costPrice || 0,
                  total: finalSubTotal,
                  parentItemId: savedParent.id,
                  menuGroupId: String(subItem.menuGroupId || ''),
                  isMarshed: false,
                  sale: savedSale,
                  isPaid: savedSale.status === 'COMPLETED'
                });
                const savedSub = await manager.save(SaleItem, newSub);
                saleItems.push(savedSub);
              }
            } else if (rawSetMenu && rawSetMenu.length > 0 && rawSetMenu[0].setType === 'FIX') {
               const defaultItems = await manager.query(`
                 SELECT sgi.productId, sgi.priceDiff, sg.id as groupId 
                 FROM set_group_items sgi
                 JOIN set_groups sg ON sg.id = sgi.setGroupId
                 WHERE sg.setMenuId = ${rawSetMenu[0].id} AND sgi.isDefault = 1 AND sgi.isActive = 1
               `);
               for (const defItem of defaultItems) {
                 const newSub = manager.create(SaleItem, {
                    productId: defItem.productId,
                    quantity: item.quantity,
                    unitPrice: defItem.priceDiff || 0,
                    saleType: item.saleType || 'STANDARD',
                    saleTypeMultiplier: item.saleTypeMultiplier || 1.00,
                    costPrice: 0,
                    total: (defItem.priceDiff || 0) * item.quantity,
                    parentItemId: savedParent.id,
                    menuGroupId: String(defItem.groupId),
                    isMarshed: false,
                    sale: savedSale,
                    isPaid: savedSale.status === 'COMPLETED'
                 });
                 const savedSub = await manager.save(SaleItem, newSub);
                 saleItems.push(savedSub);
               }
            }
          }
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
            
            // Masaya ait diğer aktif adisyonları kontrol et (şu an kapatılacak/birleştirilecek olanlar hariç)
            const otherActiveSales = await manager.find(Sale, {
              where: {
                tableId: data.tableId,
                status: In(['NEW', 'PREPARATION', 'READY', 'SERVED']),
                id: mergeSaleIds && mergeSaleIds.length > 0 ? Not(In(mergeSaleIds)) : undefined
              },
              relations: ['items']
            });

            // Yeni satış COMPLETED ise ve başka aktif adisyon yoksa masayı boşalt
            const isTableEmpty = (savedSale.status === 'COMPLETED' && otherActiveSales.length === 0);
            
            // currentTotal hesapla
            let newTotal = 0;
            if (savedSale.status !== 'COMPLETED') {
               // Yeni bir sipariş ekleniyorsa (veya sipariş güncelleniyorsa): mevcut toplam + yeni sipariş toplamı
               const itemsTotal = (savedSale.items || []).reduce((sum, i: any) => sum + Number(i.total || 0), 0);
               const effectiveTotal = itemsTotal > 0 ? itemsTotal : Number(savedSale.totalAmount || 0);
               newTotal = Number(table.currentTotal || 0) + effectiveTotal;
            } else {
               // Bir ödeme alındıysa: kalan aktif adisyonların toplamı
               newTotal = otherActiveSales.reduce((sum, s) => {
                 const sTotal = (s.items || []).reduce((isum, i) => isum + Number(i.total || 0), 0);
                 return sum + (sTotal > 0 ? sTotal : Number(s.totalAmount || 0));
               }, 0);
            }

            await manager.update(Table, data.tableId, {
              status: isTableEmpty ? 'BOŞ' : 'DOLU',
              waiterName: isTableEmpty ? '' : (waiter ? `${waiter.firstName} ${waiter.lastName}` : (table.waiterName || 'Sistem')),
              waiterId: isTableEmpty ? (null as any) : (waiter ? waiter.id : (table.waiterId || null)),
              currentTotal: Number(newTotal.toFixed(2)),
              orderStartTime: table.status === 'BOŞ' ? new Date() : (isTableEmpty ? null as any : table.orderStartTime),
              isBillRequested: false,
              tempName: isTableEmpty ? (null as any) : table.tempName
            });
          }
        }

        // Stock deduction & Old Order Cleanup
        if (!mergeSaleIds || mergeSaleIds.length === 0) {
          await this.deductStockForSale(savedSale, manager);
        } else {
          // SQL Server'da "Foreign Key" kısıtlaması nedeniyle hiyerarşik silme hatalarını (parentSaleId)
          // önlemek için silinecek olan tüm adisyonlara yönelik olan (onlara bağlı olan çocukların) referanslarını temizliyoruz.
          if (mergeSaleIds && mergeSaleIds.length > 0) {
            await manager.update(Sale, { parentSaleId: In(mergeSaleIds) }, { parentSaleId: null as any });
          }

          for (const oldId of mergeSaleIds) {
            const oldSale = await manager.findOne(Sale, { where: { id: oldId }, relations: ['items'] });
            if (oldSale) {
              // SQL Server'da "IN ()" hatası almamak için dizi uzunluğu kontrolü
              if (oldSale.items && oldSale.items.length > 0) {
                // IPTAL veya IADE edilmiş ürünleri yeni adisyona taşıyoruz (raporlar için silinmemeli)
                const cancelledOrRefunded = oldSale.items.filter(i => i.status === 'CANCELLED' || i.status === 'REFUNDED');
                const activeItems = oldSale.items.filter(i => i.status !== 'CANCELLED' && i.status !== 'REFUNDED');

                if (cancelledOrRefunded.length > 0) {
                  await manager.update(SaleItem, { id: In(cancelledOrRefunded.map(i => i.id)) }, { sale: { id: savedSale.id } });
                }

                if (activeItems.length > 0) {
                  await manager.delete(SaleItem, activeItems.map(i => i.id));
                }
              }
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
          try {
            await manager.query(`
              INSERT INTO audit_logs (timestamp, userId, actionType, saleId, tableNo, amount, description, companyId)
              VALUES (GETDATE(), @0, 'DISCOUNT', @1, @2, @3, @4, @5)
            `, [data.waiterId || (data as any).userId || 0, savedSale.id, data.tableName, data.discountAmount, `İndirim uygulandı: %${discountRate.toFixed(1)}`, data.companyId || 1]);
          } catch { /* sessizce geç */ }
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
          try {
            await manager.query(`
              INSERT INTO audit_logs (timestamp, userId, actionType, saleId, tableNo, amount, description, companyId)
              VALUES (GETDATE(), @0, 'COMPLIMENTARY', @1, @2, @3, @4, @5)
            `, [data.waiterId || (data as any).userId || 0, savedSale.id, data.tableName, 0, `İkram kaydedildi`, data.companyId || 1]);
          } catch { /* sessizce geç */ }
        }

        // ─── YAZARKASA FİŞ KESİMİ (inPOS) — COMPLETED Satışlar ───
        // ÖNEMLİ: ECR bloğu bildirimlerden ÖNCE çalışmalı.
        // ECR throw ederse transaction rollback olur ve UI'ya yanlış bildirim gitmez.
        if (fullSale.status === 'COMPLETED' && fullSale.items && fullSale.items.length > 0) {
          const inposStatus = this.inposService.getStatus();
          if (inposStatus.connected) {
            const ecrItems: InposSaleItemData[] = [];
            for (const item of fullSale.items.filter((i: any) => !i.parentItemId)) {
              const rawProduct = await manager.query(
                `SELECT p.name, p.vatRate FROM products p WHERE p.id = ${item.productId}`
              );
              const productName = rawProduct?.[0]?.name || 'Ürün';
              const vatRate = rawProduct?.[0]?.vatRate || 10;

              let section = 1;
              if (vatRate <= 1) section = 1;
              else if (vatRate <= 8) section = 2;
              else if (vatRate <= 10) section = 3;
              else section = 4;

              ecrItems.push({
                name: productName.substring(0, 96),
                unitPrice: Math.round(Number(item.unitPrice) * 100),
                multiplier: Math.round(Number(item.quantity) * 1000),
                discountRate: 0,
                discountAmount: 0,
                section,
                unit: InposUnit.Quantity,
              });
            }

            const ecrPayments: InposPaymentInfo[] = [];
            const amountInKurus = Math.round(Number(fullSale.totalAmount) * 100);
            const pm = fullSale.paymentMethod || '';

            if (pm === 'SPLIT') {
              if (Number(fullSale.paidAmountCash) > 0) {
                ecrPayments.push({ type: InposPaymentType.CashPayment, amount: Math.round(Number(fullSale.paidAmountCash) * 100) });
              }
              if (Number(fullSale.paidAmountCreditCard) > 0) {
                ecrPayments.push({ type: InposPaymentType.CreditCardPayment, amount: Math.round(Number(fullSale.paidAmountCreditCard) * 100) });
              }
            } else if (pm === 'CREDIT_CARD' || pm === 'KREDI_KARTI') {
              ecrPayments.push({ type: InposPaymentType.CreditCardPayment, amount: amountInKurus });
            } else {
              ecrPayments.push({ type: InposPaymentType.CashPayment, amount: amountInKurus });
            }

            const ecrResult = await this.inposService.processSale(ecrItems, ecrPayments);

            if (ecrResult.success) {
              await manager.update(Sale, savedSale.id, {
                ecrReceiptNo: ecrResult.receiptNo,
                ecrZNo: ecrResult.zNo,
              });
              this.logger.log(`Yazarkasa fiş kesildi — Fiş No: ${ecrResult.receiptNo}, Z No: ${ecrResult.zNo}`);
            } else {
              // Yazarkasa RED/İPTAL döndü — satışı iptal et (transaction rollback)
              throw new Error(`Yazarkasa RED: ${ecrResult.error || 'Bilinmeyen hata'}`);
            }
          }
        }

        // Bildirimler ECR başarılıysa (veya ECR bağlı değilse) buraya ulaşır
        this.kitchenGateway.notifySaleUpdate(fullSale);
        this.tablesService.clearCache();
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

  async marsItem(itemId: number): Promise<any> {
    const item = await this.saleItemRepository.findOne({
      where: { id: itemId },
      relations: ['sale', 'sale.table', 'sale.table.zone']
    });
    if (!item) throw new NotFoundException('Ürün bulunamadı');

    const itemsToMars = [item];
    
    // Eğer bu bir Set Menü ise, aktif alt ürünleri de bul ve marş et
    const children = await this.saleItemRepository.find({
      where: { parentItemId: item.id, status: 'ACTIVE' }
    });
    itemsToMars.push(...children);

    for (const targetItem of itemsToMars) {
      targetItem.isMarshed = true;
      await this.saleItemRepository.save(targetItem);

      // Mutfak bildirimini gönder
      if (this.kitchenGateway?.server) {
        this.kitchenGateway.server.emit('itemMarshed', {
          itemId: targetItem.id,
          saleId: item.sale?.id,
          tableName: item.sale?.tableName,
          productId: targetItem.productId,
          isMarshed: true,
          saleType: targetItem.saleType
        });
      }

      // Sipariş ekranı senkronizasyonu için bildirim gönder
      if (item.sale) {
        this.kitchenGateway.notifySaleUpdate(item.sale as any);
      }

      // Yazıcıya gönder
      const rawProduct = await this.saleRepository.query(`
        SELECT p.name, p.printerId FROM products p WHERE p.id = ${targetItem.productId}
      `);

      if (rawProduct && rawProduct.length > 0) {
        const printTableName = item.sale?.subCheckLabel
          ? `${item.sale?.tableName} / ${item.sale.subCheckLabel}`
          : item.sale?.tableName;

        const displayName = targetItem.saleType && targetItem.saleType !== 'STANDARD'
          ? `${rawProduct[0].name} - ${targetItem.saleType === 'HALF' ? 'Yarım' : 'Duble'}`
          : rawProduct[0].name;

        await this.printersService.printMars({
          tableName: printTableName,
          item: {
            name: displayName,
            quantity: targetItem.quantity,
            note: targetItem.note,
            printerId: rawProduct[0].printerId
          }
        });
      }
    }

    return item;
  }

  async readyItem(itemId: number): Promise<SaleItem> {
    const item = await this.saleItemRepository.findOne({
      where: { id: itemId },
      relations: ['sale', 'sale.waiter', 'sale.table', 'sale.table.zone']
    });
    if (!item) throw new NotFoundException('Ürün bulunamadı');

    item.isReady = !item.isReady;
    const updated = await this.saleItemRepository.save(item);

    const rawProduct = await this.saleRepository.query(`
      SELECT p.name FROM products p WHERE p.id = ${item.productId}
    `);
    const productName = rawProduct && rawProduct.length > 0 ? rawProduct[0].name : 'Ürün';
    const tableName = item.sale?.tableName || 'Bilinmeyen Masa';

    // Mutfak bildirimini gönder
    this.kitchenGateway.server.emit('itemReady', {
      itemId: item.id,
      saleId: item.sale?.id,
      productId: item.productId,
      isReady: updated.isReady,
      productName: productName,
      tableName: tableName
    });

    // Sipariş ekranı senkronizasyonu için bildirim gönder
    if (item.sale) {
      this.kitchenGateway.notifySaleUpdate(item.sale as any);
      this.tablesService.clearCache();
    }

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

  async updateItemTransactionType(itemId: number, type: string, reason?: string, userId: number = 0): Promise<SaleItem> {
    return await this.saleItemRepository.manager.transaction(async (manager) => {
      const item = await manager.findOne(SaleItem, {
        where: { id: itemId },
        relations: ['sale', 'sale.table']
      });
      if (!item) throw new NotFoundException('Ürün bulunamadı');

      const oldTotal = Number(item.total);
      item.transactionType = type;
      item.transactionReason = reason || null;

      let finalUnitPrice = item.unitPrice;
      const product = await manager.query(`SELECT price, staffPrice FROM products WHERE id = ${item.productId}`);
      const basePrice = product[0]?.price || 0;
      const staffPrice = product[0]?.staffPrice || 0;

      if (['COMPLIMENTARY', 'FREE', 'TICKET'].includes(type)) {
        finalUnitPrice = 0;
      } else if (type === 'STAFF') {
        finalUnitPrice = (staffPrice && Number(staffPrice) > 0) ? Number(staffPrice) : Number(basePrice);
      } else {
        finalUnitPrice = Number(basePrice);
      }

      item.unitPrice = finalUnitPrice;
      item.total = Number(item.quantity) * finalUnitPrice;
      const updated = await manager.save(SaleItem, item);

      // Update Sale and Table totals
      const diff = Number(item.total) - oldTotal;
      if (diff !== 0 && item.sale) {
        await manager.update(Sale, item.sale.id, {
          totalAmount: Number(item.sale.totalAmount) + diff
        });
        if (item.sale.tableId) {
          const table = await manager.findOne(Table, { where: { id: item.sale.tableId } });
          if (table) {
            await manager.update(Table, item.sale.tableId, {
              currentTotal: Number(table.currentTotal) + diff
            });
          }
        }
      }

      // Audit Log
      try {
        await manager.query(`
          INSERT INTO audit_logs (timestamp, userId, actionType, saleId, tableNo, amount, description, companyId)
          VALUES (GETDATE(), @0, 'TRANSACTION_TYPE_CHANGE', @1, @2, @3, @4, @5)
        `, [userId, item.sale?.id, item.sale?.tableName, diff, `İşlem tipi değiştirildi: ${type} (${reason || ''})`, (item.sale as any)?.companyId || 1]);
      } catch {}

      // Bildirim ve Önbellek Temizleme
      if (item.sale) {
        this.kitchenGateway.notifySaleUpdate(item.sale as any);
        this.tablesService.clearCache();
      }

      return updated;
    });
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
      
      const unpaidItems = items.filter(i => !i.isPaid && i.status !== 'CANCELLED' && i.status !== 'REFUNDED');
      if (unpaidItems.length === 0) return;

      const totalCheckoutAmount = unpaidItems.reduce((sum, item) => sum + (item.total || Number(item.unitPrice) * Number(item.quantity)), 0);
      const firstItemSale = unpaidItems[0].sale;
      const table = firstItemSale?.table;

      const activeDate = await this.businessDayService.getActiveBusinessDate();

      // 1. Create a unified COMPLETED Sale for these paid items
      const checkoutSale = manager.create(Sale, {
        partnerId: partnerId || firstItemSale?.partnerId,
        userId: firstItemSale?.userId || firstItemSale?.waiterId,
        waiterId: firstItemSale?.waiterId,
        tableId: table?.id,
        tableName: table?.name,
        businessDate: activeDate,
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
            freshTable.waiterId = null as any;
            freshTable.orderStartTime = null as any;
            (freshTable as any).isBillRequested = false;
          }
          await manager.save(Table, freshTable);
        }
      }

      // 4. Finance kaydı ARTIK BURADA AÇILMIYOR.
      // Kasa/masa ödemelerinin finans hareketi Gün Sonu (endOfDay) ile
      // account_transactions tablosuna toplu upsert edilir.

      // 5. Cleanup empty old temporary sales
      if (oldSaleIds.size > 0) {
         const oldIds = Array.from(oldSaleIds);
         // Hiyerarşik silme hatasını önlemek için önce bu adisyonlara yönelik referansları (child) temizle
         await manager.update(Sale, { parentSaleId: In(oldIds) }, { parentSaleId: null as any });
      }

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

      // ─── YAZARKASA FİŞ KESİMİ (inPOS) — ZORUNLU ──────────────────────
      const inposStatus = this.inposService.getStatus();
      if (inposStatus.connected) {
        // Satış kalemlerini yazarkasa formatına dönüştür
        const ecrItems: InposSaleItemData[] = [];
        for (const item of unpaidItems) {
          const rawProduct = await manager.query(
            `SELECT p.name, p.vatRate FROM products p WHERE p.id = ${item.productId}`
          );
          const productName = rawProduct?.[0]?.name || 'Ürün';
          const vatRate = rawProduct?.[0]?.vatRate || 10;

          // KDV oranına göre kısım belirle (1=%1, 2=%10, 3=%20, 4=%8 vb.)
          let section = 1;
          if (vatRate <= 1) section = 1;
          else if (vatRate <= 8) section = 2;
          else if (vatRate <= 10) section = 3;
          else section = 4;

          ecrItems.push({
            name: productName.substring(0, 96),
            unitPrice: Math.round(Number(item.unitPrice) * 100),
            multiplier: Math.round(Number(item.quantity) * 1000),
            discountRate: 0,
            discountAmount: 0,
            section,
            unit: InposUnit.Quantity,
          });
        }

        // Ödeme tipini POS → inPOS formatına dönüştür
        const ecrPayments: InposPaymentInfo[] = [];
        const amountInKurus = Math.round(totalCheckoutAmount * 100);

        if (paymentMethod === 'SPLIT') {
          if (paidAmountCash && paidAmountCash > 0) {
            ecrPayments.push({ type: InposPaymentType.CashPayment, amount: Math.round(paidAmountCash * 100) });
          }
          if (paidAmountCreditCard && paidAmountCreditCard > 0) {
            ecrPayments.push({ type: InposPaymentType.CreditCardPayment, amount: Math.round(paidAmountCreditCard * 100) });
          }
        } else if (paymentMethod === 'KREDI_KARTI' || paymentMethod === 'CREDIT_CARD') {
          ecrPayments.push({ type: InposPaymentType.CreditCardPayment, amount: amountInKurus });
        } else {
          // KASA, CASH, ve diğerleri → Nakit
          ecrPayments.push({ type: InposPaymentType.CashPayment, amount: amountInKurus });
        }

        const ecrResult = await this.inposService.processSale(ecrItems, ecrPayments);

        if (ecrResult.success) {
          await manager.update(Sale, savedCheckoutSale.id, {
            ecrReceiptNo: ecrResult.receiptNo,
            ecrZNo: ecrResult.zNo,
          });
          this.logger.log(`Yazarkasa fiş kesildi — Fiş No: ${ecrResult.receiptNo}, Z No: ${ecrResult.zNo}`);
        } else {
          // Yazarkasa RED/İPTAL döndü — satışı iptal et
          throw new Error(`Yazarkasa RED: ${ecrResult.error || 'Bilinmeyen hata'}`);
        }
      }
    });

    if (itemIds && itemIds.length > 0) {
      // Birinci item üzerinden masa bilgisini alıp bildirim gönder
      const firstItem = await this.saleItemRepository.findOne({ where: { id: itemIds[0] }, relations: ['sale'] });
      if (firstItem?.sale) {
        this.kitchenGateway.notifySaleUpdate(firstItem.sale as any);
      }
    }

    this.tablesService.clearCache();
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

    // JS Filtreleme: İptal edilenleri çıkar
    sales.forEach(sale => {
      if (sale.items) {
        sale.items = sale.items.filter(i => i.status !== 'CANCELLED' && i.status !== 'REFUNDED');
      }
    });

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

  // Automatic End of Day and manual endOfDay logic moved to BusinessDayService
  // Automatic End of Day and manual endOfDay logic moved to BusinessDayService


  async cancelTableOrders(tableId: number, userId: number): Promise<void> {
    if (userId) {
      const cached = getCachedPerms(userId);
      const isSuper = cached?.roleName === 'ADMIN' || cached?.roleName === 'ADMINISTRATOR';
      if (!isSuper && !cached?.allUserPerms?.includes('OP:CAN_CANCEL_SALE')) {
        throw new BadRequestException('Adisyon iptal etme yetkiniz bulunmamaktadır.');
      }
    }

    await this.saleRepository.manager.transaction(async (manager) => {
      const activeSales = await manager.find(Sale, {
        where: { tableId, status: In(['NEW', 'PREPARATION', 'READY', 'SERVED']) }
      });
      const saleIds = activeSales.map(s => s.id);

      if (saleIds.length > 0) {
        await manager.update(Sale, { id: In(saleIds) }, { status: 'CANCELLED' });
        await manager.update(SaleItem, { sale: { id: In(saleIds) } }, { status: 'CANCELLED', cancelReason: 'Masa İptali' });
      }
      const table = await manager.findOne(Table, { where: { id: tableId, isDeleted: false } });
      if (table) {
        await manager.update(Table, tableId, {
          status: 'BOŞ',
          waiterName: '',
          waiterId: null as any,
          currentTotal: 0,
          orderStartTime: () => 'NULL',
          isBillRequested: false,
        });
      }
      this.tablesService.clearCache();
    });

    // Bildirim tetikle
    this.kitchenGateway.notifySaleUpdate({ tableId } as any);
    this.alertsService.trigger('SALE_CANCELLED', {
      tableId,
      description: `Masa #${tableId} adisyonu iptal edildi.`,
    }).catch(() => {});

    // Denetim logu
    try {
      await this.saleRepository.query(`
        INSERT INTO audit_logs (timestamp, actionType, tableNo, description, companyId)
        VALUES (GETDATE(), 'ADISYON_CANCEL', @0, @1, 1)
      `, [String(tableId), `Masa #${tableId} toplu adisyon iptali`]);
    } catch { /* sessiz geç */ }
  }

  async cancelSale(id: number, reason: string, userId: number): Promise<Sale> {
    if (userId) {
      const cached = getCachedPerms(userId);
      const isSuper = cached?.roleName === 'ADMIN' || cached?.roleName === 'ADMINISTRATOR';
      if (!isSuper && !cached?.allUserPerms?.includes('OP:CAN_CANCEL_SALE')) {
        throw new BadRequestException('Adisyon iptal etme yetkiniz bulunmamaktadır.');
      }
    }

    return await this.saleRepository.manager.transaction(async (manager) => {
      const sale = await manager.findOne(Sale, {
        where: { id },
        relations: ['items', 'table']
      });
      if (!sale) throw new NotFoundException('Satış bulunamadı.');

      // Update Sale
      sale.status = 'CANCELLED';
      (sale as any).cancelReason = reason;
      const updated = await manager.save(Sale, sale);

      // Update Items
      if (sale.items && sale.items.length > 0) {
        await manager.update(SaleItem, { sale: { id: sale.id } }, { status: 'CANCELLED', cancelReason: reason });
      }

      // Update Table Total
      if (sale.tableId) {
        const table = await manager.findOne(Table, { where: { id: sale.tableId } });
        if (table) {
          const otherActiveSales = await manager.find(Sale, {
            where: { tableId: sale.tableId, status: In(['NEW', 'PREPARATION', 'READY', 'SERVED']), id: Not(id) }
          });
          const isTableEmpty = otherActiveSales.length === 0;
          const newTotal = otherActiveSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

          await manager.update(Table, sale.tableId, {
            status: isTableEmpty ? 'BOŞ' : 'DOLU',
            currentTotal: Number(newTotal.toFixed(2)),
            waiterName: isTableEmpty ? '' : table.waiterName,
            waiterId: isTableEmpty ? null as any : table.waiterId,
            orderStartTime: isTableEmpty ? null as any : table.orderStartTime,
            isBillRequested: false
          });
        }
      }

      // Audit Log
      try {
        await manager.query(`
          INSERT INTO audit_logs (timestamp, userId, actionType, saleId, tableNo, amount, description, companyId)
          VALUES (GETDATE(), @0, 'SALE_CANCEL', @1, @2, @3, @4, @5)
        `, [userId, id, sale.tableName, sale.totalAmount, reason || 'Adisyon iptal edildi', sale.companyId || 1]);
      } catch {}

      this.kitchenGateway.notifySaleUpdate(updated as any);
      this.tablesService.clearCache();
      return updated;
    });
  }

  async cancelItem(itemId: number, reason: string, userId: number): Promise<SaleItem> {
    if (userId) {
      const cached = getCachedPerms(userId);
      const isSuper = cached?.roleName === 'ADMIN' || cached?.roleName === 'ADMINISTRATOR';
      if (!isSuper && !cached?.allUserPerms?.includes('OP:CAN_CANCEL_SALE')) {
        throw new BadRequestException('Ürün iptal etme yetkiniz bulunmamaktadır.');
      }
    }

    const item = await this.saleItemRepository.findOne({
      where: { id: itemId },
      relations: ['sale', 'sale.waiter', 'sale.table', 'sale.table.zone']
    });
    if (!item) throw new NotFoundException('Ürün bulunamadı.');

    if (item.parentItemId) {
      throw new BadRequestException('Set menü içerikleri tek tek iptal edilemez. Lütfen ana menüyü iptal ediniz.');
    }

    // isMarshed check removed: garson mutfağa gönderilmiş ürünü de iptal edebilir
    // Mutfak ekranına iptal bildirimi gidecek

    item.status = 'CANCELLED';
    item.cancelReason = reason;
    (item as any).cancelledByUserId = userId;

    const updated = await this.saleItemRepository.save(item);

    const childItems = await this.saleItemRepository.find({ where: { parentItemId: item.id, status: 'ACTIVE' } });
    for (const child of childItems) {
      child.status = 'CANCELLED';
      child.cancelReason = reason;
      (child as any).cancelledByUserId = userId;
      await this.saleItemRepository.save(child);
    }

    // Mutfak çıktısı (Parametreye bağlı)
    const printOnCancel = await this.parametersService.getValue('printer', 'print_on_cancel');
    if (printOnCancel === 'true') {
      const fullItem = await this.saleItemRepository.findOne({
        where: { id: item.id },
        relations: ['sale', 'sale.table', 'sale.table.zone', 'sale.waiter', 'product', 'product.outputProfile']
      });
      if (fullItem) {
        await this.printersService.printKitchen({
          tableName: fullItem.sale?.tableName || fullItem.sale?.table?.name,
          waiterName: fullItem.sale?.waiter ? `${fullItem.sale.waiter.firstName} ${fullItem.sale.waiter.lastName}` : 'Garson',
          zoneId: fullItem.sale?.table?.zone?.id,
          items: [fullItem]
        });
      }
    }

    // Yeni: Parametrik Stok geri alımı
    const isStockReverseEnabled = await this.checkStockReverseParam('cancel');
    if (isStockReverseEnabled) {
      try {
        await this.stocksService.deductStock(item.productId, -Number(item.quantity));
      } catch { /* sessiz geç */ }
    }

    // Denetim logu
    try {
      await this.saleRepository.query(`
        INSERT INTO audit_logs (timestamp, userId, actionType, saleId, productName, amount, description, companyId)
        VALUES (GETDATE(), @0, 'ITEM_CANCEL', @1, @2, @3, @4, 1)
      `, [userId, item.sale?.id, `Ürün #${item.productId}`, item.total, reason || 'İptal edildi']);
    } catch { /* audit log hatası sessizce geç */ }

    // Yeni: Reçete bazlı stok geri yükleme (StockMovement)
    if (isStockReverseEnabled) {
      try {
        const recipeMultiplier = item.saleTypeMultiplier ? Number(item.saleTypeMultiplier) : 1;
        await this.stockMovementsService.createReverseConsumption(
          item.productId,
          Number(item.quantity),
          recipeMultiplier,
          'SALE',
          item.sale?.id,
          userId,
          undefined,
          item.variationId || undefined,
        );
      } catch (err) {
        this.logger.warn('StockMovement cancel reverse error (non-fatal):', err?.message);
      }
    }

    // 12.md: Ürün İşlem Geçmişi Kaydı (İptal)
    try {
        await this.productsService.recordTransaction({
            productId: item.productId,
            variationId: item.variationId || undefined,
            variationName: item.variationName || undefined,
            productName: `[IPTAL] ${item.productId}`, // Item table sometimes doesn't have name
            qty: -Number(item.quantity),
            price: Number(item.total),
            type: 'void',
            status: 'completed',
            orderId: item.sale?.id,
            userId: userId,
            businessDate: item.sale?.createdAt || new Date(),
        });
    } catch {}

    // 13. Adisyon ve Masa durumlarını güncelle (Tutarlar & Askıda kalma kontrolü)
    if (item.sale) {
      const remainingItems = await this.saleItemRepository.find({
        where: { sale: { id: item.sale.id } }
      });
      const activeItems = remainingItems.filter(i => i.status !== 'CANCELLED' && i.status !== 'REFUNDED');
      const newTotalAmount = activeItems.reduce((sum, i) => sum + Number(i.total || (Number(i.unitPrice) * Number(i.quantity))), 0);

      const manager = this.saleRepository.manager;
      if (activeItems.length === 0) {
        await manager.update(Sale, item.sale.id, { status: 'CANCELLED', totalAmount: 0 });
        if (item.sale.tableId) {
           const otherActiveSales = await this.saleRepository.count({
             where: { tableId: item.sale.tableId, status: In(['NEW', 'PREPARATION', 'READY', 'SERVED']) }
           });
           if (otherActiveSales === 0) {
              await manager.update(Table, item.sale.tableId, {
                  status: 'BOŞ',
                  waiterName: '',
                  currentTotal: 0,
                  orderStartTime: () => 'NULL',
                  isBillRequested: false,
              });
              this.alertsService.trigger('SALE_CANCELLED', {
                tableId: item.sale.tableId,
                description: `Tüm ürünler iptal edildiği için masa adisyonu otomatik kapatıldı.`
              }).catch(() => {});
           }
        }
      } else {
        await manager.update(Sale, item.sale.id, { totalAmount: newTotalAmount });
        if (item.sale.tableId) {
            const activeSales = await this.saleRepository.find({
              where: { tableId: item.sale.tableId, status: In(['NEW', 'PREPARATION', 'READY', 'SERVED']) }
            });
            const newTableTotal = activeSales.reduce((sum, s) => sum + (s.id === item.sale.id ? newTotalAmount : Number(s.totalAmount)), 0);
            await manager.update(Table, item.sale.tableId, { currentTotal: newTableTotal });
        }
      }
    }

    this.kitchenGateway.notifySaleUpdate(item.sale as any);
    this.tablesService.clearCache();
    return updated;
  }

  async refundItem(itemId: number, reason: string, userId: number): Promise<SaleItem> {
    if (userId) {
      const cached = getCachedPerms(userId);
      const isSuper = cached?.roleName === 'ADMIN' || cached?.roleName === 'ADMINISTRATOR';
      if (!isSuper && !cached?.allUserPerms?.includes('OP:CAN_REFUND')) {
        throw new BadRequestException('İade yapma yetkiniz bulunmamaktadır.');
      }
    }
    const item = await this.saleItemRepository.findOne({
      where: { id: itemId },
      relations: ['sale', 'sale.table'],
    });
    if (!item) throw new NotFoundException('Ürün bulunamadı.');

    if (item.parentItemId) {
      throw new BadRequestException('Set menü içerikleri tek tek iade edilemez. Lütfen ana menüyü iade ediniz.');
    }

    item.status = 'REFUNDED';
    item.refundReason = reason;
    (item as any).refundedByUserId = userId;

    const updated = await this.saleItemRepository.save(item);

    const childItems = await this.saleItemRepository.find({ where: { parentItemId: item.id, status: 'ACTIVE' } });
    for (const child of childItems) {
      child.status = 'REFUNDED';
      child.refundReason = reason;
      (child as any).refundedByUserId = userId;
      await this.saleItemRepository.save(child);
    }

    // Mutfak çıktısı (Parametreye bağlı)
    const printOnRefund = await this.parametersService.getValue('printer', 'print_on_refund');
    if (printOnRefund === 'true') {
      const fullItem = await this.saleItemRepository.findOne({
        where: { id: item.id },
        relations: ['sale', 'sale.table', 'sale.table.zone', 'sale.waiter', 'product', 'product.outputProfile']
      });
      if (fullItem) {
        await this.printersService.printKitchen({
          tableName: fullItem.sale?.tableName || fullItem.sale?.table?.name,
          waiterName: fullItem.sale?.waiter ? `${fullItem.sale.waiter.firstName} ${fullItem.sale.waiter.lastName}` : 'Garson',
          zoneId: fullItem.sale?.table?.zone?.id,
          items: [fullItem]
        });
      }
    }

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

    // Yeni: Reçete bazlı stok geri yükleme (StockMovement)
    const isRefundReverseEnabled = await this.checkStockReverseParam('refund');
    if (isRefundReverseEnabled) {
      try {
        const recipeMultiplier = item.saleTypeMultiplier ? Number(item.saleTypeMultiplier) : 1;
        await this.stockMovementsService.createReverseConsumption(
          item.productId,
          Number(item.quantity),
          recipeMultiplier,
          'SALE',
          item.sale?.id,
          userId,
          undefined,
          item.variationId || undefined,
        );
      } catch (err) {
        this.logger.warn('StockMovement refund item reverse error (non-fatal):', err?.message);
      }
    }

    if (item.sale) {
      const remainingItems = await this.saleItemRepository.find({
        where: { sale: { id: item.sale.id } }
      });
      const activeItems = remainingItems.filter(i => i.status !== 'CANCELLED' && i.status !== 'REFUNDED');
      const newTotalAmount = activeItems.reduce((sum, i) => sum + Number(i.total || (Number(i.unitPrice) * Number(i.quantity))), 0);

      const manager = this.saleRepository.manager;
      if (activeItems.length === 0) {
        await manager.update(Sale, item.sale.id, { status: 'CANCELLED', totalAmount: 0 });
        if (item.sale.tableId) {
           const otherActiveSales = await this.saleRepository.count({
             where: { tableId: item.sale.tableId, status: In(['NEW', 'PREPARATION', 'READY', 'SERVED']) }
           });
           if (otherActiveSales === 0) {
              await manager.update(Table, item.sale.tableId, {
                  status: 'BOŞ',
                  waiterName: '',
                  currentTotal: 0,
                  orderStartTime: () => 'NULL',
                  isBillRequested: false,
              });
           }
        }
      } else {
        await manager.update(Sale, item.sale.id, { totalAmount: newTotalAmount });
        if (item.sale.tableId) {
            const activeSales = await this.saleRepository.find({
              where: { tableId: item.sale.tableId, status: In(['NEW', 'PREPARATION', 'READY', 'SERVED']) }
            });
            const newTableTotal = activeSales.reduce((sum, s) => sum + (s.id === item.sale.id ? newTotalAmount : Number(s.totalAmount)), 0);
            await manager.update(Table, item.sale.tableId, { currentTotal: newTableTotal });
        }
      }
      this.kitchenGateway.notifySaleUpdate(item.sale as any);
      this.tablesService.clearCache();
    }


    return updated;
  }

  async refundSale(saleId: number, reason: string, userId: number): Promise<Sale> {
    if (userId) {
      const cached = getCachedPerms(userId);
      const isSuper = cached?.roleName === 'ADMIN' || cached?.roleName === 'ADMINISTRATOR';
      if (!isSuper && !cached?.allUserPerms?.includes('OP:CAN_REFUND')) {
        throw new BadRequestException('İade yapma yetkiniz bulunmamaktadır.');
      }
    }
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

    // Mutfak çıktısı (Parametreye bağlı)
    const printOnRefundBulk = await this.parametersService.getValue('printer', 'print_on_refund');
    if (printOnRefundBulk === 'true' && sale.items?.length) {
      const fullItems = await this.saleItemRepository.find({
        where: { sale: { id: sale.id } },
        relations: ['product', 'product.outputProfile', 'sale', 'sale.waiter', 'sale.table', 'sale.table.zone']
      });
      if (fullItems.length > 0) {
        const first = fullItems[0];
        await this.printersService.printKitchen({
          tableName: first.sale?.tableName || first.sale?.table?.name,
          waiterName: first.sale?.waiter ? `${first.sale.waiter.firstName} ${first.sale.waiter.lastName}` : 'Garson',
          zoneId: first.sale?.table?.zone?.id,
          items: fullItems
        });
      }
    }

    // Denetim logu
    try {
      await this.saleRepository.query(`
        INSERT INTO audit_logs (timestamp, userId, actionType, saleId, tableNo, amount, description, companyId)
        VALUES (GETDATE(), @0, 'SALE_REFUND', @1, @2, @3, @4, 1)
      `, [userId, saleId, sale.tableName, sale.totalAmount, reason || 'Tam adisyon iadesi']);
    } catch { /* sessizce geç */ }

    // Yeni: Reçete bazlı stok geri yükleme (tüm kalemler için)
    const isSaleRefundReverseEnabled = await this.checkStockReverseParam('refund');
    if (isSaleRefundReverseEnabled) {
      try {
        if (sale.items?.length) {
          for (const item of sale.items) {
            if (!item.productId) continue;
            const recipeMultiplier = item.saleTypeMultiplier ? Number(item.saleTypeMultiplier) : 1;
            await this.stockMovementsService.createReverseConsumption(
              item.productId,
              Number(item.quantity),
              recipeMultiplier,
              'SALE',
              saleId,
              userId,
              undefined,
              item.variationId || undefined,
            );
          }
        }
      } catch (err) {
        this.logger.warn('StockMovement refund reverse error (non-fatal):', err?.message);
      }
    }

    this.kitchenGateway.notifySaleUpdate(updated as any);
    this.tablesService.clearCache();
    return updated;
  }

  private async getRecipeMultiplier(saleType: string, manager: any): Promise<number> {
    if (!saleType || saleType === 'STANDARD') return 1.0;
    const paramKey = saleType === 'HALF' ? 'half_recipe_multiplier' : 'double_recipe_multiplier';
    const result = await manager.query(
      `SELECT value FROM system_parameters WHERE [module] = 'pos' AND [key] = '${paramKey}'`
    );
    return result[0]?.value ? Number(result[0].value) : 1.0;
  }

  private async checkStockReverseParam(type: 'cancel' | 'refund'): Promise<boolean> {
    try {
      const key = type === 'cancel' ? 'cancel_stock_reverse' : 'refund_stock_reverse';
      const result = await this.saleRepository.query(`
        SELECT value FROM system_parameters WHERE [module] = 'pos' AND [key] = @0
      `, [key]);
      
      if (!result || result.length === 0) return type === 'cancel'; // Varsayılan: İptal için true, İade için false
      return result[0].value === 'true' || result[0].value === true;
    } catch {
      return type === 'cancel';
    }
  }

  private async deductStockForSale(sale: Sale, manager: any): Promise<void> {
    const items = sale.items;
    if (!items || items.length === 0) return;

    // Varsayılan depo bilgisini çek (Reçete tüketimi için)
    const warehouseResult = await manager.query(
      `SELECT value FROM system_parameters WHERE [module] = 'stock' AND [key] = 'default_warehouse_id'`
    );
    const defaultWarehouseId = warehouseResult[0]?.value ? parseInt(warehouseResult[0].value) : undefined;

    // Zone ID'sini sale üzerinden bulmaya çalışalım (Eğer masalı satışsa)
    let saleZoneId: number | undefined;
    if (sale.tableId) {
      const tableResult = await manager.query(`SELECT zoneId FROM tables WHERE id = ${sale.tableId}`);
      if (tableResult && tableResult.length > 0) {
        saleZoneId = tableResult[0].zoneId;
      }
    }

    for (const item of items) {
      if (!item.productId) continue;

      // Ürün bilgilerini ve stok bağı tipini taze çek
      const productResults = await manager.query(`
        SELECT inventoryLinkType, linkedStockItemId, directStockQty, directStockUnit, name, costPrice, productTypeId
        FROM products WHERE id = ${item.productId}
      `);
      
      if (!productResults || productResults.length === 0) continue;
      const product = productResults[0];

      // Zone ve ProductType bazlı depo haritasını çek
      let mappedWarehouseId: number | undefined;
      if (saleZoneId && product.productTypeId) {
        const mappingResult = await manager.query(`
          SELECT warehouseId FROM zone_mappings 
          WHERE zoneId = ${saleZoneId} AND productTypeId = ${product.productTypeId}
        `);
        if (mappingResult && mappingResult.length > 0 && mappingResult[0].warehouseId) {
          mappedWarehouseId = mappingResult[0].warehouseId;
        }
      }

      // Eğer maplenmiş depo varsa onu kullan, yoksa varsayılan depo
      const targetWarehouseId = mappedWarehouseId || defaultWarehouseId;

      // --- YENİ: Varyant bilgisi çek ---
      let variation = null;
      if (item.variationId) {
        const variations = await manager.query(`
          SELECT inventoryLinkType, linkedStockItemId, directStockQty, 
                 directStockUnit, recipeHeaderId
          FROM product_variations WHERE id = ${item.variationId}
        `);
        variation = variations?.[0] || null;
      }

      // Karar ağacı: varyant özel yoksa ürün fallback
      const linkType = (variation?.inventoryLinkType) || product.inventoryLinkType || 'none';

      try {
        if (linkType === 'none' || linkType === 'NONE') {
          // Hiçbir şey yapma
          // 12.md: Yalnızca Audit kaydı düş
          await this.productsService.recordTransaction({
              productId: item.productId,
              variationId: item.variationId || undefined,
              variationName: item.variationName || undefined,
              productName: product.name,
              qty: Number(item.quantity),
              price: Number(item.unitPrice || 0),
              type: 'sale',
              status: 'completed',
              orderId: sale.id,
              userId: sale.userId || sale.waiterId,
              businessDate: sale.createdAt || new Date(),
          });
          continue;
        } 
        
        else if (linkType === 'direct_stock') {
          const stockItemId = variation?.linkedStockItemId || product.linkedStockItemId;
          const stockQty = variation?.directStockQty || product.directStockQty;
          const stockUnit = variation?.directStockUnit || product.directStockUnit;

          if (stockItemId && stockQty) {
            // Direkt stokta tekil sayıdır, saleTypeMultiplier fiyatı etkiler stok tüketimini DEĞİL.
            const totalQty = Number(stockQty) * Number(item.quantity);
            await this.stockMovementsService.createDirectSaleConsumption(
              stockItemId,
              totalQty,
              stockUnit || 'adet',
              'SALE',
              sale.id,
              sale.userId || sale.waiterId,
              targetWarehouseId,
              manager
            );

            const card = await manager.query(`SELECT costPerBaseUnit FROM stock_cards WHERE id = ${stockItemId}`);
            const cost = Number(card[0]?.costPerBaseUnit || 0) * totalQty;
            await manager.getRepository(SaleItem).update(item.id, { costPrice: cost });
          }
        } 
        
        else if (linkType === 'recipe') {
          const recipeMultiplier = await this.getRecipeMultiplier(item.saleType, manager);
          
          let recipeHeaderFallback = false;
          if (variation?.recipeHeaderId) {
            const headerCheck = await manager.query(`SELECT id FROM recipe_headers WHERE id = ${variation.recipeHeaderId} AND isActive = 1`);
            if (headerCheck && headerCheck.length > 0) {
              await this.stockMovementsService.createRecipeConsumptionByHeaderId(
                headerCheck[0].id,
                Number(item.quantity),
                recipeMultiplier,
                'SALE',
                sale.id,
                sale.userId || sale.waiterId,
                targetWarehouseId,
                manager,
              );
            } else {
              recipeHeaderFallback = true;
            }
          } else {
            recipeHeaderFallback = true;
          }

          if (recipeHeaderFallback) {
             await this.stockMovementsService.createRecipeConsumption(
               item.productId,
               Number(item.quantity),
               recipeMultiplier,
               'SALE',
               sale.id,
               sale.userId || sale.waiterId,
               targetWarehouseId,
               manager,
             );
          }

          const costData = await this.recipesService.calculateCost(item.productId);
          await manager.getRepository(SaleItem).update(item.id, { costPrice: costData.totalCost });
        }

        // 12.md: Ürün İşlem Geçmişi Kaydı
        await this.productsService.recordTransaction({
            productId: item.productId,
            variationId: item.variationId || undefined,
            variationName: item.variationName || undefined,
            productName: product.name,
            qty: Number(item.quantity),
            price: Number(item.unitPrice || 0),
            type: 'sale',
            status: 'completed',
            orderId: sale.id,
            userId: sale.userId || sale.waiterId,
            businessDate: sale.createdAt || new Date(),
        });

      } catch (err) {
        this.logger.error(`Stock deduction failed for Item #${item.id} (Product #${item.productId}): ${err.message}`);
      }
    }
  }

  // ==============================
  // Alt Adisyon (Sub-Check) Metotları
  // ==============================

  /**
   * Mevcut bir adisyona yeni bir alt adisyon ekler.
   */
  async createSubCheck(parentSaleId: number, label?: string): Promise<Sale> {
    const parentSale = await this.saleRepository.findOne({
      where: { id: parentSaleId },
      relations: ['items', 'table', 'subChecks'],
    });
    if (!parentSale) throw new NotFoundException('Üst adisyon bulunamadı.');

    // Eğer parentSale zaten bir alt adisyon ise, gerçek kök adisyonu bul
    const rootSaleId = parentSale.parentSaleId || parentSale.id;

    // Mevcut alt adisyon sayısını say
    const existingCount = await this.saleRepository.count({
      where: { parentSaleId: rootSaleId },
    });
    const subCheckIndex = existingCount + 1;
    const defaultLabel = label || `Adisyon ${subCheckIndex + 1}`;

    // Ana adisyona da label ata (ilk kez alt adisyon oluşturuluyorsa)
    if (!parentSale.subCheckLabel && !parentSale.parentSaleId) {
      await this.saleRepository.update(rootSaleId, { subCheckLabel: 'Adisyon 1', subCheckIndex: 0 });
    }

    const newSubCheck = this.saleRepository.create({
      parentSaleId: rootSaleId,
      subCheckLabel: defaultLabel,
      subCheckIndex,
      tableId: parentSale.tableId,
      tableName: parentSale.tableName,
      waiterId: parentSale.waiterId,
      userId: parentSale.userId,
      cashRegisterId: parentSale.cashRegisterId,
      shiftId: parentSale.shiftId,
      partnerId: parentSale.partnerId,
      companyId: parentSale.companyId,
      status: 'NEW',
      totalAmount: 0,
      discountAmount: 0,
      serviceFee: 0,
    });

    const saved = await this.saleRepository.save(newSubCheck);

    // WebSocket bildirim
    this.kitchenGateway.notifySaleUpdate(saved);

    return saved;
  }

  /**
   * Varolan bir adisyona (veya alt-adisyona) yeni ürünler ekler
   */
  async appendItems(saleId: number, items: any[], addedByUserId: number = 0): Promise<Sale> {
    return await this.saleRepository.manager.transaction(async (manager) => {
      const sale = await manager.findOne(Sale, {
        where: { id: saleId },
        relations: ['items', 'table', 'table.zone', 'waiter']
      });
      if (!sale) throw new NotFoundException('Adisyon bulunamadı.');

      // --- Sahiplik Kontrolü (Ownership Check) ---
      if (addedByUserId) {
          const cached = getCachedPerms(addedByUserId);
          let extraPerms: string[] = [];
          let roleName = '';

          if (cached) {
              extraPerms = cached.allUserPerms;
              roleName = (cached.roleName || '').toUpperCase();
          } else {
              const user = await manager.findOne(User, { where: { id: addedByUserId }, relations: ['role'] });
              extraPerms = user?.extraPermissions || [];
              roleName = (user?.role?.name || '').toUpperCase();
          }

          if (roleName !== 'ADMIN' && roleName !== 'ADMINISTRATOR') {
              if (!extraPerms.includes('OP:CAN_ORDER')) {
                  throw new BadRequestException('Sipariş alma yetkiniz bulunmamaktadır.');
              }

              if (sale.table?.isBillRequested && !extraPerms.includes('OP:ORDER_AFTER_BILL')) {
                  throw new BadRequestException('Adisyon zaten yazdırılmış. Yeni ürün eklemek için yetkiniz yetersiz veya masa geri açılmalıdır.');
              }

              if (extraPerms.includes('OWN_TABLES_ONLY')) {
                  // Eğer masa kilitliyse ve waiterId atanmışsa, kontrol et
                  if (sale.waiterId && sale.waiterId !== addedByUserId) {
                      throw new BadRequestException('Bu masa başka bir personele aittir. Sipariş ekleyemezsiniz.');
                  }
              }
          }
      }

      if (!items || items.length === 0) return sale;

      const newSaleItems: SaleItem[] = [];
      for (const item of items) {
        let rawSetMenu = null;
        if (!item.subItems || item.subItems.length === 0) {
          const rawProducts = await manager.query(`SELECT isSet FROM products WHERE id = ${item.productId}`);
          if (rawProducts[0]?.isSet) {
             rawSetMenu = await manager.query(`SELECT id, setType FROM set_menus WHERE productId = ${item.productId}`);
          }
        }

        // Fiyat değişikliği doğrulaması
        const productPrice = await manager.query(`SELECT price FROM products WHERE id = ${item.productId}`);
        if (productPrice.length > 0 && Math.abs(Number(productPrice[0].price) - Number(item.unitPrice)) > 0.01) {
           // Opsiyonel: Fiyat değişikliği loglanabilir veya hata fırlatılabilir
        }

        const tType = item.transactionType || 'SALE';
        const tReason = item.transactionReason || null;

        // İşlem Tipi Yetki Kontrolleri
        if (addedByUserId && tType !== 'SALE') {
          const cached = getCachedPerms(addedByUserId);
          const up = cached?.allUserPerms || [];
          const isSuper = cached?.roleName === 'ADMIN' || cached?.roleName === 'ADMINISTRATOR';
          
          if (!isSuper) {
            if (tType === 'COMPLIMENTARY' && !up.includes('OP:CAN_COMPLIMENTARY')) throw new BadRequestException('İkram yapma yetkiniz bulunmamaktadır.');
            if (tType === 'FREE' && !up.includes('OP:NON_PAYMENT')) throw new BadRequestException('Bedelsiz işlem yapma yetkiniz bulunmamaktadır.');
            if (tType === 'PROMOTION' && !up.includes('OP:CAN_PROMOTION')) throw new BadRequestException('Promosyon uygulama yetkiniz bulunmamaktadır.');
            if (tType === 'STAFF' && !up.includes('OP:STAFF_SALE')) throw new BadRequestException('Personel satışı yapma yetkiniz bulunmamaktadır.');
            if (tType === 'TICKET' && !up.includes('OP:CAN_TICKET')) throw new BadRequestException('Bilet işlemi yapma yetkiniz bulunmamaktadır.');
          }
        }

        let finalUnitPrice = Number(item.unitPrice);
        if (['COMPLIMENTARY', 'FREE', 'TICKET'].includes(tType)) {
          finalUnitPrice = 0;
        } else if (tType === 'STAFF') {
          const prod = await manager.query(`SELECT staffPrice, price FROM products WHERE id = ${item.productId}`);
          if (prod && prod.length > 0) {
            finalUnitPrice = (prod[0].staffPrice && Number(prod[0].staffPrice) > 0) ? Number(prod[0].staffPrice) : Number(prod[0].price);
          }
        }

        const parentItem = manager.create(SaleItem, {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: finalUnitPrice,
          transactionType: tType,
          transactionReason: tReason,
          saleType: item.saleType || 'STANDARD',
          saleTypeMultiplier: item.saleTypeMultiplier || 1.00,
          costPrice: item.costPrice || 0,
          total: item.total || (Number(item.quantity) * finalUnitPrice),
          note: item.note,
          isWaiting: item.isWaiting || false,
          isMarshed: false,
          sale: sale,
          isPaid: sale.status === 'COMPLETED',
          addedByUserId: addedByUserId || undefined,
          addedAt: new Date(),
        });
        const savedParent = await manager.save(SaleItem, parentItem);
        newSaleItems.push(savedParent);

        if (item.subItems && item.subItems.length > 0) {
          for (const subItem of item.subItems) {
            const newSub = manager.create(SaleItem, {
              productId: subItem.productId,
              quantity: subItem.quantity * item.quantity,
              unitPrice: subItem.unitPrice || 0,
              saleType: item.saleType || 'STANDARD',
              saleTypeMultiplier: item.saleTypeMultiplier || 1.00,
              costPrice: subItem.costPrice || 0,
              total: (subItem.unitPrice || 0) * (subItem.quantity * item.quantity),
              parentItemId: savedParent.id,
              menuGroupId: String(subItem.menuGroupId || ''),
              isMarshed: false,
              sale: sale,
              isPaid: sale.status === 'COMPLETED'
            });
            const savedSub = await manager.save(SaleItem, newSub);
            newSaleItems.push(savedSub);
          }
        } else if (rawSetMenu && rawSetMenu.length > 0 && rawSetMenu[0].setType === 'FIX') {
           const defaultItems = await manager.query(`
             SELECT sgi.productId, sgi.priceDiff, sg.id as groupId 
             FROM set_group_items sgi
             JOIN set_groups sg ON sg.id = sgi.setGroupId
             WHERE sg.setMenuId = ${rawSetMenu[0].id} AND sgi.isDefault = 1 AND sgi.isActive = 1
           `);
           for (const defItem of defaultItems) {
             const newSub = manager.create(SaleItem, {
                productId: defItem.productId,
                quantity: item.quantity,
                unitPrice: defItem.priceDiff || 0,
                saleType: item.saleType || 'STANDARD',
                saleTypeMultiplier: item.saleTypeMultiplier || 1.00,
                costPrice: 0,
                total: (defItem.priceDiff || 0) * item.quantity,
                parentItemId: savedParent.id,
                menuGroupId: String(defItem.groupId),
                isMarshed: false,
                sale: sale,
                isPaid: sale.status === 'COMPLETED'
             });
             const savedSub = await manager.save(SaleItem, newSub);
             newSaleItems.push(savedSub);
           }
        }
      }

      const newItemsTotal = newSaleItems.reduce((sum, i) => sum + Number(i.total || (Number(i.quantity) * Number(i.unitPrice))), 0);

      // IMPORTANT: Push new items to sale relation array before saving sale, otherwise TypeORM cascade will detached/delete them.
      if (sale.items) {
        sale.items.push(...newSaleItems);
      } else {
        sale.items = newSaleItems;
      }
      
      sale.totalAmount = Number(sale.totalAmount) + newItemsTotal;
      await manager.save(Sale, sale);

      if (sale.tableId) {
        const table = await manager.findOne(Table, { where: { id: sale.tableId } });
        if (table) {
          table.currentTotal = Number(table.currentTotal || 0) + newItemsTotal;
          await manager.save(Table, table);
        }
      }

      const fakeSale = { ...sale, items: newSaleItems } as Sale;
      await this.deductStockForSale(fakeSale, manager);

      const refreshedSale = await manager.findOne(Sale, {
        where: { id: saleId },
        relations: ['items', 'table', 'table.zone', 'waiter', 'subChecks', 'parentSale']
      });
      const fullSales = await this.mapProductsToSales([refreshedSale as Sale], manager);
      const fullSale = fullSales[0];

      this.kitchenGateway.notifySaleUpdate(fullSale);
      this.tablesService.clearCache();
      if (fullSale.status === 'NEW' || fullSale.status === 'PREPARATION') {
        this.kitchenGateway.notifyNewOrder(fullSale as any);
      }

      return fullSale;
    });
  }

  /**
   * Adisyon bölme: Kaynak adisyondan seçilen ürünleri yeni bir alt adisyona taşır.
   * Miktar bölme destekler (örn: 3 adet Cola → 2 kaynak, 1 hedef).
   */
  async splitCheck(
    saleId: number,
    itemIds: number[],
    quantities?: Record<number, number>,
    newLabel?: string,
  ): Promise<{ source: Sale; newCheck: Sale }> {
    return await this.saleRepository.manager.transaction(async (manager) => {
      const sourceSale = await manager.findOne(Sale, {
        where: { id: saleId },
        relations: ['items', 'table', 'subChecks'],
      });
      if (!sourceSale) throw new NotFoundException('Kaynak adisyon bulunamadı.');

      // Taşınacak item'ları doğrula (Seçilenler + Alt Ürünler)
      const selectedItems = await manager.find(SaleItem, {
        where: { id: In(itemIds), sale: { id: saleId } },
      });
      if (selectedItems.length === 0) throw new BadRequestException('Taşınacak ürün bulunamadı.');

      const allItemIds = new Set(itemIds);
      for (const item of selectedItems) {
        if (item.parentItemId && !allItemIds.has(item.parentItemId)) {
          throw new BadRequestException('Set menü içeriği tek başına taşınamaz. Lütfen ana menüyü seçiniz.');
        }
        const children = await manager.find(SaleItem, {
          where: { parentItemId: item.id, status: 'ACTIVE' }
        });
        children.forEach(c => allItemIds.add(c.id));
      }

      const sourceItems = await manager.find(SaleItem, {
        where: { id: In(Array.from(allItemIds)), sale: { id: saleId } },
      });

      // Yeni alt adisyon oluştur
      const rootSaleId = sourceSale.parentSaleId || sourceSale.id;
      const existingCount = await manager.count(Sale, {
        where: { parentSaleId: rootSaleId },
      });
      const subCheckIndex = existingCount + 1;
      const label = newLabel || `Adisyon ${subCheckIndex + 1}`;

      // Ana adisyona label ata (ilk kez)
      if (!sourceSale.subCheckLabel && !sourceSale.parentSaleId) {
        await manager.update(Sale, rootSaleId, { subCheckLabel: 'Adisyon 1', subCheckIndex: 0 });
      }

      const newCheck = manager.create(Sale, {
        parentSaleId: rootSaleId,
        subCheckLabel: label,
        subCheckIndex,
        tableId: sourceSale.tableId,
        tableName: sourceSale.tableName,
        waiterId: sourceSale.waiterId,
        userId: sourceSale.userId,
        cashRegisterId: sourceSale.cashRegisterId,
        shiftId: sourceSale.shiftId,
        partnerId: sourceSale.partnerId,
        companyId: sourceSale.companyId,
        status: sourceSale.status,
        totalAmount: 0,
        discountAmount: 0,
        serviceFee: 0,
      });
      const savedNewCheck = await manager.save(Sale, newCheck);

      let newCheckTotal = 0;
      let sourceDeduction = 0;

      sourceItems.sort((a, b) => (a.parentItemId ? 1 : 0) - (b.parentItemId ? 1 : 0));
      const partiallyTransferredParentIds = new Set<number>();

      for (const item of sourceItems) {
        if (item.parentItemId && partiallyTransferredParentIds.has(item.parentItemId)) {
          continue; // Alt ürün zaten parent içindeyken bölünüp aktarıldı, eskisini atla
        }
        const splitQty = quantities?.[item.id];

        if (splitQty && splitQty < Number(item.quantity)) {
          if (item.parentItemId) {
             throw new BadRequestException('Set menü veya ekstra ürünler tek başına parçalanamaz, ana ürünü parçalayınız.');
          }

          // Miktar bölme: kaynak miktarını azalt, yeni item oluştur
          const remainingQty = Number(item.quantity) - splitQty;
          await manager.update(SaleItem, item.id, {
            quantity: remainingQty,
            total: remainingQty * Number(item.unitPrice),
          });

          const newItem = manager.create(SaleItem, {
            productId: item.productId,
            quantity: splitQty,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            total: splitQty * Number(item.unitPrice),
            note: item.note,
            isMarshed: item.isMarshed,
            isWaiting: item.isWaiting,
            isReady: item.isReady,
            isPaid: false,
            status: item.status,
            saleType: item.saleType || 'STANDARD',
            saleTypeMultiplier: item.saleTypeMultiplier || 1.00,
            sale: savedNewCheck,
            variationId: item.variationId,
            variationName: item.variationName,
            productTypeName: item.productTypeName,
          });
          const savedNewItem = await manager.save(SaleItem, newItem);

          newCheckTotal += splitQty * Number(item.unitPrice);
          sourceDeduction += splitQty * Number(item.unitPrice);
          partiallyTransferredParentIds.add(item.id);

          const children = await manager.find(SaleItem, { where: { parentItemId: item.id, status: 'ACTIVE' } });
          for (const child of children) {
            let childSplitQty = 0;
            if (quantities && quantities[child.id] !== undefined) {
              childSplitQty = Number(quantities[child.id]);
            } else {
              const childQtyPerParent = Number(child.quantity) / Number(item.quantity);
              childSplitQty = childQtyPerParent * splitQty;
            }

            if (childSplitQty <= 0) continue;
            
            childSplitQty = Math.min(childSplitQty, Number(child.quantity));
            const childRemainingQty = Number(child.quantity) - childSplitQty;

            if (childRemainingQty <= 0) {
              await manager.update(SaleItem, child.id, {
                parentItemId: savedNewItem.id,
              });
              await manager.query(`UPDATE sale_items SET saleId = ${savedNewCheck.id} WHERE id = ${child.id}`);
              newCheckTotal += childSplitQty * Number(child.unitPrice);
              sourceDeduction += childSplitQty * Number(child.unitPrice);
            } else {
              await manager.update(SaleItem, child.id, {
                quantity: childRemainingQty,
                total: childRemainingQty * Number(child.unitPrice),
              });

              const newChild = manager.create(SaleItem, {
                ...child,
                id: undefined,
                quantity: childSplitQty,
                total: childSplitQty * Number(child.unitPrice),
                parentItemId: savedNewItem.id,
                sale: savedNewCheck,
              });
              await manager.save(SaleItem, newChild);

              newCheckTotal += childSplitQty * Number(child.unitPrice);
              sourceDeduction += childSplitQty * Number(child.unitPrice);
            }
          }
        } else {
          // Tam taşıma: item'ı yeni adisyona aktar
          await manager.update(SaleItem, item.id, { sale: savedNewCheck } as any);
          // TypeORM update ile relation atamak güvenilmez, raw query yapalım
          await manager.query(`UPDATE sale_items SET saleId = ${savedNewCheck.id} WHERE id = ${item.id}`);

          newCheckTotal += Number(item.total || Number(item.unitPrice) * Number(item.quantity));
          sourceDeduction += Number(item.total || Number(item.unitPrice) * Number(item.quantity));
        }
      }

      // Tutarları güncelle
      await manager.update(Sale, savedNewCheck.id, { totalAmount: newCheckTotal });
      const newSourceTotal = Math.max(0, Number(sourceSale.totalAmount) - sourceDeduction);
      await manager.update(Sale, sourceSale.id, { totalAmount: newSourceTotal });

      // Güncel halleri getir
      const updatedSource = await manager.findOne(Sale, {
        where: { id: sourceSale.id },
        relations: ['items', 'table'],
      }) as Sale;
      const updatedNew = await manager.findOne(Sale, {
        where: { id: savedNewCheck.id },
        relations: ['items', 'table'],
      }) as Sale;

      // WebSocket bildirim
      this.kitchenGateway.notifySaleUpdate(updatedSource);
      this.kitchenGateway.notifySaleUpdate(updatedNew);
      this.tablesService.clearCache();

      return { source: updatedSource, newCheck: updatedNew };
    });
  }

  /**
   * Bir masadaki tüm alt adisyonları ağaç yapısında getirir.
   */
  async getTableSubChecks(tableId: number): Promise<Sale[]> {
    const sales = await this.saleRepository.find({
      where: {
        tableId,
        status: In(['NEW', 'PREPARATION', 'READY', 'SERVED']),
      },
      relations: ['items', 'table', 'waiter', 'subChecks', 'subChecks.items'],
      order: { subCheckIndex: 'ASC', createdAt: 'ASC' },
    });

    // JS Filtreleme: İptal / İade edilenleri ARTIK ÇIKARMIYORUZ (Hesap çıktısı ve UI için gerekli)
    /*
    sales.forEach(sale => {
      if (sale.items) {
        sale.items = sale.items.filter(i => i.status !== 'CANCELLED' && i.status !== 'REFUNDED');
      }
      if (sale.subChecks) {
        sale.subChecks.forEach(sub => {
          if (sub.items) {
            sub.items = sub.items.filter(i => i.status !== 'CANCELLED' && i.status !== 'REFUNDED');
          }
        });
      }
    });
    */

    // Sadece kök adisyonları dön (alt adisyonlar zaten subChecks relation'ında)
    const rootSales = sales.filter(s => !s.parentSaleId);

    // Product bilgilerini map et
    const allSales = [...rootSales];
    rootSales.forEach(s => {
      if (s.subChecks) allSales.push(...s.subChecks);
    });
    await this.mapProductsToSales(allSales);

    // Item'lara kimin eklediği (addedByName) ve ne zaman (addedAt) bilgisini inject et
    const allItemIds = allSales.flatMap(s => s.items?.map(i => i.id) || []);
    if (allItemIds.length > 0) {
      try {
        const userMap: any[] = await this.saleRepository.manager.query(`
          SELECT si.id as itemId, u.firstName, u.lastName, si.addedAt
          FROM sale_items si
          LEFT JOIN users u ON u.id = si.addedByUserId
          WHERE si.id IN (${allItemIds.join(',')})
        `);
        allSales.forEach(s => {
          s.items?.forEach((item: any) => {
            const u = userMap.find(x => Number(x.itemId) === Number(item.id));
            if (u && u.firstName) {
              (item as any).addedByName = u.firstName || null;
              (item as any).addedAt = u.addedAt || s.createdAt || null;
            } else {
              // Fallback for old records without item-level tracking
              (item as any).addedByName = s.waiter?.firstName || null;
              (item as any).addedAt = s.createdAt || null;
            }
          });
        });
      } catch (e) {
        this.logger.warn('addedByName inject failed (non-critical): ' + e?.message);
      }
    }

    return rootSales;
  }

  /**
   * Ürünleri bir adisyondan diğerine taşır.
   */
  async moveItems(
    sourceId: number,
    targetId: number,
    itemIds: number[],
    quantities?: Record<number, number>,
  ): Promise<{ source: Sale; target: Sale }> {
    return await this.saleRepository.manager.transaction(async (manager) => {
      const sourceSale = await manager.findOne(Sale, { where: { id: sourceId }, relations: ['items'] });
      const targetSale = await manager.findOne(Sale, { where: { id: targetId }, relations: ['items'] });
      if (!sourceSale) throw new NotFoundException('Kaynak adisyon bulunamadı.');
      if (!targetSale) throw new NotFoundException('Hedef adisyon bulunamadı.');

      // Aynı masa kontrolü
      if (sourceSale.tableId !== targetSale.tableId) {
        throw new BadRequestException('Ürün taşıma sadece aynı masa içinde yapılabilir.');
      }

      // Taşınacak item'ları bul (Seçilenler + Alt Ürünler)
      const selectedItems = await manager.find(SaleItem, {
        where: { id: In(itemIds), sale: { id: sourceId } },
      });
      if (selectedItems.length === 0) throw new BadRequestException('Taşınacak ürün bulunamadı.');

      const allItemIds = new Set(itemIds);
      for (const item of selectedItems) {
        if (item.parentItemId && !allItemIds.has(item.parentItemId)) {
          throw new BadRequestException('Set menü içeriği tek başına taşınamaz. Lütfen ana menüyü seçiniz.');
        }
        
        const children = await manager.find(SaleItem, {
          where: { parentItemId: item.id, status: 'ACTIVE' }
        });
        children.forEach(c => allItemIds.add(c.id));
      }

      const items = await manager.find(SaleItem, {
        where: { id: In(Array.from(allItemIds)), sale: { id: sourceId } },
      });

      let movedTotal = 0;

      items.sort((a, b) => (a.parentItemId ? 1 : 0) - (b.parentItemId ? 1 : 0));
      const partiallyTransferredParentIds = new Set<number>();

      for (const item of items) {
        if (item.parentItemId && partiallyTransferredParentIds.has(item.parentItemId)) {
          continue;
        }
        const splitQty = quantities?.[item.id];
        if (splitQty && splitQty < Number(item.quantity)) {
          if (item.parentItemId) {
             throw new BadRequestException('Set menü veya ekstra ürünler tek başına parçalanamaz, ana ürünü parçalayınız.');
          }

          const remainingQty = Number(item.quantity) - splitQty;
          await manager.update(SaleItem, item.id, {
            quantity: remainingQty,
            total: remainingQty * Number(item.unitPrice),
          });

          const newItem = manager.create(SaleItem, {
            productId: item.productId,
            quantity: splitQty,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            total: splitQty * Number(item.unitPrice),
            note: item.note,
            isMarshed: item.isMarshed,
            isWaiting: item.isWaiting,
            isReady: item.isReady,
            isPaid: false,
            status: item.status,
            saleType: item.saleType || 'STANDARD',
            saleTypeMultiplier: item.saleTypeMultiplier || 1.00,
            sale: targetSale,
            variationId: item.variationId,
            variationName: item.variationName,
            productTypeName: item.productTypeName,
          });
          const savedNewItem = await manager.save(SaleItem, newItem);
          movedTotal += splitQty * Number(item.unitPrice);
          partiallyTransferredParentIds.add(item.id);

          const children = await manager.find(SaleItem, { where: { parentItemId: item.id, status: 'ACTIVE' } });
          for (const child of children) {
            let childSplitQty = 0;
            if (quantities && quantities[child.id] !== undefined) {
              childSplitQty = Number(quantities[child.id]);
            } else {
              const childQtyPerParent = Number(child.quantity) / Number(item.quantity);
              childSplitQty = childQtyPerParent * splitQty;
            }

            if (childSplitQty <= 0) continue;
            
            childSplitQty = Math.min(childSplitQty, Number(child.quantity));
            const childRemainingQty = Number(child.quantity) - childSplitQty;

            if (childRemainingQty <= 0) {
              await manager.update(SaleItem, child.id, {
                parentItemId: savedNewItem.id,
              });
              await manager.query(`UPDATE sale_items SET saleId = ${targetSale.id} WHERE id = ${child.id}`);
              movedTotal += childSplitQty * Number(child.unitPrice);
            } else {
              await manager.update(SaleItem, child.id, {
                quantity: childRemainingQty,
                total: childRemainingQty * Number(child.unitPrice),
              });

              const newChild = manager.create(SaleItem, {
                ...child,
                id: undefined,
                quantity: childSplitQty,
                total: childSplitQty * Number(child.unitPrice),
                parentItemId: savedNewItem.id,
                sale: targetSale,
              });
              await manager.save(SaleItem, newChild);
              movedTotal += childSplitQty * Number(child.unitPrice);
            }
          }
        } else {
          await manager.query(`UPDATE sale_items SET saleId = ${targetId} WHERE id = ${item.id}`);
          movedTotal += Number(item.total || Number(item.unitPrice) * Number(item.quantity));
        }
      }

      // Tutarları güncelle
      await manager.update(Sale, sourceId, {
        totalAmount: Math.max(0, Number(sourceSale.totalAmount) - movedTotal),
      });
      await manager.update(Sale, targetId, {
        totalAmount: Number(targetSale.totalAmount) + movedTotal,
      });

      const updatedSource = await manager.findOne(Sale, { where: { id: sourceId }, relations: ['items'] }) as Sale;
      const updatedTarget = await manager.findOne(Sale, { where: { id: targetId }, relations: ['items'] }) as Sale;

      this.kitchenGateway.notifySaleUpdate(updatedSource);
      this.kitchenGateway.notifySaleUpdate(updatedTarget);
      this.tablesService.clearCache();

      return { source: updatedSource, target: updatedTarget };
    });
  }

  /**
   * Tüm alt adisyonları ana adisyona birleştirir.
   */
  async mergeSubChecks(parentSaleId: number): Promise<Sale> {
    return await this.saleRepository.manager.transaction(async (manager) => {
      const parentSale = await manager.findOne(Sale, {
        where: { id: parentSaleId },
        relations: ['items', 'subChecks', 'subChecks.items'],
      });
      if (!parentSale) throw new NotFoundException('Ana adisyon bulunamadı.');

      const subChecks = parentSale.subChecks || [];
      if (subChecks.length === 0) {
        throw new BadRequestException('Birleştirilecek alt adisyon bulunamadı.');
      }

      let totalMergedAmount = 0;

      for (const subCheck of subChecks) {
        // Alt adisyonun item'larını ana adisyona taşı
        if (subCheck.items && subCheck.items.length > 0) {
          for (const item of subCheck.items) {
            await manager.query(`UPDATE sale_items SET saleId = ${parentSaleId} WHERE id = ${item.id}`);
          }
          totalMergedAmount += Number(subCheck.totalAmount);
        }
        // Alt adisyonu sil
        await manager.delete(Sale, subCheck.id);
      }

      // Ana adisyonun tutarını ve label bilgilerini güncelle
      await manager.update(Sale, parentSaleId, {
        totalAmount: Number(parentSale.totalAmount) + totalMergedAmount,
        subCheckLabel: null as any,
        subCheckIndex: 0,
      });

      const updatedParent = await manager.findOne(Sale, {
        where: { id: parentSaleId },
        relations: ['items', 'table', 'waiter'],
      }) as Sale;

      const mapped = await this.mapProductsToSales([updatedParent], manager);
      this.kitchenGateway.notifySaleUpdate(mapped[0]);

      return mapped[0];
    });
  }
  // ==============================
  // Transfer Metotları
  // ==============================

  private generateTransferCode(sourceTableId: number, subCheckIndex: number): string {
    const ts = Date.now().toString(36).toUpperCase().slice(-3);
    return `TRF-M${sourceTableId}-A${subCheckIndex}-${ts}`;
  }

  private async createTransferLogEntry(manager: any, data: Partial<TransferLog>): Promise<TransferLog> {
    const log = manager.create(TransferLog, data);
    return manager.save(TransferLog, log);
  }

  /**
   * Ürün(ler)i başka masaya transfer et.
   * Hedef masada yeni alt adisyon oluşturur.
   */
  async transferItemsToTable(body: {
    sourceSubCheckId: number;
    targetTableId: number;
    itemIds: number[];
    quantities?: Record<number, number>;
    confirmed?: boolean;
  }, userId: number): Promise<any> {
    return await this.saleRepository.manager.transaction(async (manager) => {
      // 1. Kaynak adisyonu al
      const sourceSale = await manager.findOne(Sale, {
        where: { id: body.sourceSubCheckId },
        relations: ['items', 'table'],
      });
      if (!sourceSale) throw new NotFoundException('Kaynak adisyon bulunamadı.');

      // 2. Hedef masayı al
      const targetTable = await manager.findOne(Table, { where: { id: body.targetTableId, isDeleted: false } });
      if (!targetTable) throw new NotFoundException('Hedef masa bulunamadı.');

      // 3. Aynı masa kontrolü → Bu metot farklı masaya taşır
      if (sourceSale.tableId === body.targetTableId) {
        throw new BadRequestException('Aynı masaya ürün transferi için transferItemsWithinTable kullanın.');
      }

      // 4. Dolu masa onay kontrolü
      if (targetTable.status === 'DOLU' && !body.confirmed) {
        return { requireConfirmation: true, message: 'Dolu bir masaya taşıma yapıyorsunuz. Onaylıyor musunuz?' };
      }

      // 5. Taşınacak item'ları bul (Seçilenler + Alt Ürünler)
      const selectedItems = await manager.find(SaleItem, {
        where: { id: In(body.itemIds), sale: { id: body.sourceSubCheckId } },
      });
      if (selectedItems.length === 0) throw new BadRequestException('Taşınacak ürün bulunamadı.');

      const allItemIds = new Set(body.itemIds);
      for (const item of selectedItems) {
        if (item.parentItemId && !allItemIds.has(item.parentItemId)) {
          throw new BadRequestException('Set menü içeriği tek başına taşınamaz. Lütfen ana menüyü seçiniz.');
        }
        
        const children = await manager.find(SaleItem, {
          where: { parentItemId: item.id, status: 'ACTIVE' }
        });
        children.forEach(c => allItemIds.add(c.id));
      }

      const items = await manager.find(SaleItem, {
        where: { id: In(Array.from(allItemIds)), sale: { id: body.sourceSubCheckId } },
      });

      // 6. Transfer kodu oluştur
      const transferCode = this.generateTransferCode(sourceSale.tableId, sourceSale.subCheckIndex || 0);

      // 7. Hedef masada parent sale bul
      let targetParentSale = await manager.findOne(Sale, {
        where: { tableId: body.targetTableId, parentSaleId: null as any, status: In(['NEW', 'PREPARATION', 'READY', 'SERVED']) },
        relations: ['subChecks'],
      });

      let targetSaleForItems: Sale;
      const sourceLabel = sourceSale.subCheckLabel || `Adisyon ${sourceSale.subCheckIndex + 1}`;
      const newLabel = `${sourceSale.tableName || 'Paket'} / ${sourceLabel}'den Taşınan`;

      if (!targetParentSale) {
        // Hedef masa boşsa, direkt kök adisyon olarak transfer adisyonunu oluştur
        targetParentSale = manager.create(Sale, {
          tableId: body.targetTableId,
          tableName: targetTable.name,
          waiterId: sourceSale.waiterId,
          userId: sourceSale.userId,
          partnerId: sourceSale.partnerId,
          companyId: sourceSale.companyId,
          status: sourceSale.status || 'NEW',
          totalAmount: 0,
          discountAmount: 0,
          serviceFee: 0,
          subCheckLabel: newLabel,
          subCheckIndex: 0,
          transferredFromTableId: sourceSale.tableId,
          transferredFromTableName: sourceSale.tableName,
          transferCode,
          transferredByUserId: userId,
          createdByUserId: sourceSale.createdByUserId || sourceSale.userId,
        });
        targetParentSale = await manager.save(Sale, targetParentSale);
        targetSaleForItems = targetParentSale;
      } else {
        // Hedef masa doluysa, mevcut kök adisyon altına yeni bir alt adisyon aç
        const existingCount = await manager.count(Sale, { where: { parentSaleId: targetParentSale.id } });
        const subCheckIndex = existingCount + 1;

        const newSubCheck = manager.create(Sale, {
          parentSaleId: targetParentSale.id,
          subCheckLabel: newLabel,
          subCheckIndex,
          tableId: body.targetTableId,
          tableName: targetTable.name,
          waiterId: sourceSale.waiterId,
          userId: sourceSale.userId,
          partnerId: sourceSale.partnerId,
          companyId: sourceSale.companyId,
          status: sourceSale.status || 'NEW',
          totalAmount: 0,
          discountAmount: 0,
          serviceFee: 0,
          transferredFromTableId: sourceSale.tableId,
          transferredFromTableName: sourceSale.tableName,
          transferCode,
          transferredByUserId: userId,
          createdByUserId: sourceSale.createdByUserId || sourceSale.userId,
        });
        targetSaleForItems = await manager.save(Sale, newSubCheck);
      }

      // 9. Ürünleri taşı
      let movedTotal = 0;
      const transferredItemsList: any[] = [];
      const newItems: SaleItem[] = [];

      items.sort((a, b) => (a.parentItemId ? 1 : 0) - (b.parentItemId ? 1 : 0));
      const partiallyTransferredParentIds = new Set<number>();

      for (const item of items) {
        if (item.parentItemId && partiallyTransferredParentIds.has(item.parentItemId)) {
          continue;
        }
        const splitQty = body.quantities?.[item.id];

        // Ürün bilgisini al
        let productName = `Ürün #${item.productId}`;
        try {
          const rawProduct = await manager.query(`SELECT name FROM products WHERE id = ${item.productId}`);
          if (rawProduct[0]) productName = rawProduct[0].name;
        } catch { }

        if (splitQty && splitQty < Number(item.quantity)) {
          if (item.parentItemId) {
             throw new BadRequestException('Set menü veya ekstra ürünler tek başına parçalanamaz, ana ürünü parçalayınız.');
          }

          // Miktar bölme
          const remainingQty = Number(item.quantity) - splitQty;
          await manager.update(SaleItem, item.id, {
            quantity: remainingQty,
            total: remainingQty * Number(item.unitPrice),
          });

          const newItem = manager.create(SaleItem, {
            productId: item.productId,
            quantity: splitQty,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            total: splitQty * Number(item.unitPrice),
            note: item.note,
            isMarshed: item.isMarshed,
            isWaiting: item.isWaiting,
            isReady: item.isReady,
            isPaid: false,
            status: item.status,
            productTypeName: item.productTypeName,
            saleType: item.saleType || 'STANDARD',
            saleTypeMultiplier: item.saleTypeMultiplier || 1.00,
            sale: targetSaleForItems,
            variationId: item.variationId,
            variationName: item.variationName,
          });
          const savedNewItem = await manager.save(SaleItem, newItem);
          newItems.push(savedNewItem);
          const itemTotal = splitQty * Number(item.unitPrice);
          movedTotal += itemTotal;
          transferredItemsList.push({ productId: item.productId, name: productName, quantity: splitQty, total: itemTotal });
          partiallyTransferredParentIds.add(item.id);

          const children = await manager.find(SaleItem, { where: { parentItemId: item.id, status: 'ACTIVE' } });
          for (const child of children) {
            let childSplitQty = 0;
            if (body.quantities && body.quantities[child.id] !== undefined) {
              childSplitQty = Number(body.quantities[child.id]);
            } else {
              const childQtyPerParent = Number(child.quantity) / Number(item.quantity);
              childSplitQty = childQtyPerParent * splitQty;
            }

            if (childSplitQty <= 0) continue;
            
            childSplitQty = Math.min(childSplitQty, Number(child.quantity));
            const childRemainingQty = Number(child.quantity) - childSplitQty;

            if (childRemainingQty <= 0) {
              await manager.update(SaleItem, child.id, {
                parentItemId: savedNewItem.id,
              });
              await manager.query(`UPDATE sale_items SET saleId = ${targetSaleForItems.id} WHERE id = ${child.id}`);
              movedTotal += childSplitQty * Number(child.unitPrice);
            } else {
              await manager.update(SaleItem, child.id, {
                quantity: childRemainingQty,
                total: childRemainingQty * Number(child.unitPrice),
              });

              const newChild = manager.create(SaleItem, {
                ...child,
                id: undefined,
                quantity: childSplitQty,
                total: childSplitQty * Number(child.unitPrice),
                parentItemId: savedNewItem.id,
                sale: targetSaleForItems,
              });
              const savedNewChild = await manager.save(SaleItem, newChild);
              newItems.push(savedNewChild);
              movedTotal += childSplitQty * Number(child.unitPrice);
            }
          }
        } else {
          // Tam taşıma
          const itemTotal = Number(item.total || Number(item.unitPrice) * Number(item.quantity));
          await manager.query(`UPDATE sale_items SET saleId = ${targetSaleForItems.id} WHERE id = ${item.id}`);
          movedTotal += itemTotal;
          transferredItemsList.push({ productId: item.productId, name: productName, quantity: Number(item.quantity), total: itemTotal });
        }
      }

      // 10. Tutarları güncelle
      const newTargetTotal = Number(targetSaleForItems.totalAmount || 0) + movedTotal;
      await manager.update(Sale, targetSaleForItems.id, { totalAmount: Math.max(0, newTargetTotal) });

      const newSourceTotal = Math.max(0, Number(sourceSale.totalAmount) - movedTotal);
      await manager.update(Sale, sourceSale.id, { totalAmount: newSourceTotal });

      // Target parent totalAmount update
      const targetParentTotal = Number(targetParentSale.totalAmount || 0) + movedTotal;
      await manager.update(Sale, targetParentSale.id, { totalAmount: targetParentTotal });

      // 11. Masa durumlarını güncelle
      // Hedef masa
      await manager.update(Table, body.targetTableId, {
        status: 'DOLU',
        currentTotal: Number(targetTable.currentTotal || 0) + movedTotal,
      });

      // Kaynak masayı kontrol et
      if (sourceSale.tableId) {
        const sourceTable = await manager.findOne(Table, { where: { id: sourceSale.tableId } });
        if (sourceTable) {
          const newSourceTableTotal = Math.max(0, Number(sourceTable.currentTotal || 0) - movedTotal);
          if (newSourceTableTotal <= 0) {
            // Kaynak masada başka aktif satış var mı?
            const remainingSales = await manager.count(Sale, {
              where: { tableId: sourceSale.tableId, status: In(['NEW', 'PREPARATION', 'READY', 'SERVED']) },
            });
            const remainingItems = await manager.query(`
              SELECT COUNT(*) as cnt FROM sale_items si
              JOIN sales s ON s.id = si.saleId
              WHERE s.tableId = ${sourceSale.tableId} AND s.status IN ('NEW','PREPARATION','READY','SERVED') AND si.status = 'ACTIVE'
            `);
            const hasItems = Number(remainingItems[0]?.cnt || 0) > 0;

            await manager.update(Table, sourceSale.tableId, {
              status: hasItems ? 'DOLU' : 'BOŞ',
              currentTotal: hasItems ? newSourceTableTotal : 0,
              waiterName: hasItems ? sourceTable.waiterName : '',
              orderStartTime: hasItems ? sourceTable.orderStartTime : (null as any),
            });
          } else {
            await manager.update(Table, sourceSale.tableId, { currentTotal: newSourceTableTotal });
          }
        }
      }

      // 12. Transfer log oluştur
      await this.createTransferLogEntry(manager, {
        transferType: 'ITEM_TRANSFER',
        sourceTableId: sourceSale.tableId,
        sourceTableName: sourceSale.tableName,
        sourceSubCheckId: sourceSale.id,
        sourceSubCheckLabel: sourceLabel,
        targetTableId: body.targetTableId,
        targetTableName: targetTable.name,
        targetSubCheckId: targetSaleForItems.id,
        targetSubCheckLabel: newLabel,
        transferredItems: JSON.stringify(transferredItemsList),
        userId,
        amountBefore: Number(sourceSale.totalAmount),
        amountAfter: newSourceTotal,
        transferCode,
        companyId: sourceSale.companyId || 1,
      });

      // 13. WebSocket bildirim
      const cleanSource = await manager.findOne(Sale, { where: { id: sourceSale.id }, relations: ['items'] });
      const cleanTarget = await manager.findOne(Sale, { where: { id: targetSaleForItems.id }, relations: ['items'] });
      if (cleanSource) this.kitchenGateway.notifySaleUpdate(cleanSource);
      if (cleanTarget) this.kitchenGateway.notifySaleUpdate(cleanTarget);
      this.tablesService.clearCache();

      return {
        success: true,
        transferCode,
        sourceSubCheck: { id: sourceSale.id, newTotal: newSourceTotal },
        targetSubCheck: { id: targetSaleForItems.id, label: newLabel, total: movedTotal },
        transferredItems: transferredItemsList,
      };
    });
  }

  /**
   * Aynı masa içinde ürün(ler)i farklı alt adisyona taşır.
   * targetSubCheckId = 'NEW' ise yeni alt adisyon oluşturur.
   */
  async transferItemsWithinTable(body: {
    sourceSubCheckId: number;
    targetSubCheckId: number | 'NEW';
    itemIds: number[];
    quantities?: Record<number, number>;
    newLabel?: string;
  }, userId: number): Promise<any> {
    return await this.saleRepository.manager.transaction(async (manager) => {
      const sourceSale = await manager.findOne(Sale, {
        where: { id: body.sourceSubCheckId },
        relations: ['items'],
      });
      if (!sourceSale) throw new NotFoundException('Kaynak adisyon bulunamadı.');

      let targetSale: Sale;

      if (body.targetSubCheckId === 'NEW') {
        // Yeni alt adisyon oluştur
        const rootSaleId = sourceSale.parentSaleId || sourceSale.id;
        const existingCount = await manager.count(Sale, { where: { parentSaleId: rootSaleId } });
        const subCheckIndex = existingCount + 1;
        const label = body.newLabel || `Adisyon ${subCheckIndex + 1}`;

        // Ana adisyona label ata (ilk kez)
        if (!sourceSale.subCheckLabel && !sourceSale.parentSaleId) {
          await manager.update(Sale, rootSaleId, { subCheckLabel: 'Adisyon 1', subCheckIndex: 0 });
        }

        const newCheck = manager.create(Sale, {
          parentSaleId: rootSaleId,
          subCheckLabel: label,
          subCheckIndex,
          tableId: sourceSale.tableId,
          tableName: sourceSale.tableName,
          waiterId: sourceSale.waiterId,
          userId: sourceSale.userId,
          cashRegisterId: sourceSale.cashRegisterId,
          shiftId: sourceSale.shiftId,
          partnerId: sourceSale.partnerId,
          companyId: sourceSale.companyId,
          status: sourceSale.status || 'NEW',
          totalAmount: 0,
          discountAmount: 0,
          serviceFee: 0,
        });
        targetSale = await manager.save(Sale, newCheck);
      } else {
        targetSale = await manager.findOne(Sale, {
          where: { id: body.targetSubCheckId as number },
          relations: ['items'],
        }) as Sale;
        if (!targetSale) throw new NotFoundException('Hedef adisyon bulunamadı.');

        // Aynı masa kontrolü
        if (sourceSale.tableId !== targetSale.tableId) {
          throw new BadRequestException('Masa içi taşıma sadece aynı masanın adisyonları arasında yapılabilir.');
        }
      }

      // Taşınacak item'ları bul (Seçilenler + Alt Ürünler)
      const selectedItems = await manager.find(SaleItem, {
        where: { id: In(body.itemIds), sale: { id: body.sourceSubCheckId } },
      });
      if (selectedItems.length === 0) throw new BadRequestException('Taşınacak ürün bulunamadı.');

      const allItemIds = new Set(body.itemIds);
      for (const item of selectedItems) {
        if (item.parentItemId && !allItemIds.has(item.parentItemId)) {
          throw new BadRequestException('Set menü içeriği tek başına taşınamaz. Lütfen ana menüyü seçiniz.');
        }
        
        const children = await manager.find(SaleItem, {
          where: { parentItemId: item.id, status: 'ACTIVE' }
        });
        children.forEach(c => allItemIds.add(c.id));
      }

      const items = await manager.find(SaleItem, {
        where: { id: In(Array.from(allItemIds)), sale: { id: body.sourceSubCheckId } },
      });

      let movedTotal = 0;

      items.sort((a, b) => (a.parentItemId ? 1 : 0) - (b.parentItemId ? 1 : 0));
      const partiallyTransferredParentIds = new Set<number>();

      for (const item of items) {
        if (item.parentItemId && partiallyTransferredParentIds.has(item.parentItemId)) {
          continue;
        }
        const splitQty = body.quantities?.[item.id];

        if (splitQty && splitQty < Number(item.quantity)) {
          if (item.parentItemId) {
             throw new BadRequestException('Set menü veya ekstra ürünler tek başına parçalanamaz, ana ürünü parçalayınız.');
          }

          const remainingQty = Number(item.quantity) - splitQty;
          await manager.update(SaleItem, item.id, {
            quantity: remainingQty,
            total: remainingQty * Number(item.unitPrice),
          });

          const newItem = manager.create(SaleItem, {
            productId: item.productId,
            quantity: splitQty,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            total: splitQty * Number(item.unitPrice),
            note: item.note,
            isMarshed: item.isMarshed,
            isWaiting: item.isWaiting,
            isReady: item.isReady,
            isPaid: false,
            status: item.status,
            productTypeName: item.productTypeName,
            saleType: item.saleType || 'STANDARD',
            saleTypeMultiplier: item.saleTypeMultiplier || 1.00,
            sale: targetSale,
            variationId: item.variationId,
            variationName: item.variationName,
          });
          const savedNewItem = await manager.save(SaleItem, newItem);
          movedTotal += splitQty * Number(item.unitPrice);
          partiallyTransferredParentIds.add(item.id);

          const children = await manager.find(SaleItem, { where: { parentItemId: item.id, status: 'ACTIVE' } });
          for (const child of children) {
            let childSplitQty = 0;
            if (body.quantities && body.quantities[child.id] !== undefined) {
              childSplitQty = Number(body.quantities[child.id]);
            } else {
              const childQtyPerParent = Number(child.quantity) / Number(item.quantity);
              childSplitQty = childQtyPerParent * splitQty;
            }

            if (childSplitQty <= 0) continue;
            
            childSplitQty = Math.min(childSplitQty, Number(child.quantity));
            const childRemainingQty = Number(child.quantity) - childSplitQty;

            if (childRemainingQty <= 0) {
              await manager.update(SaleItem, child.id, {
                parentItemId: savedNewItem.id,
              });
              await manager.query(`UPDATE sale_items SET saleId = ${targetSale.id} WHERE id = ${child.id}`);
              movedTotal += childSplitQty * Number(child.unitPrice);
            } else {
              await manager.update(SaleItem, child.id, {
                quantity: childRemainingQty,
                total: childRemainingQty * Number(child.unitPrice),
              });

              const newChild = manager.create(SaleItem, {
                ...child,
                id: undefined,
                quantity: childSplitQty,
                total: childSplitQty * Number(child.unitPrice),
                parentItemId: savedNewItem.id,
                sale: targetSale,
              });
              await manager.save(SaleItem, newChild);
              movedTotal += childSplitQty * Number(child.unitPrice);
            }
          }
        } else {
          await manager.query(`UPDATE sale_items SET saleId = ${targetSale.id} WHERE id = ${item.id}`);
          movedTotal += Number(item.total || Number(item.unitPrice) * Number(item.quantity));
        }
      }

      // Tutarları güncelle
      await manager.update(Sale, sourceSale.id, {
        totalAmount: Math.max(0, Number(sourceSale.totalAmount) - movedTotal),
      });
      await manager.update(Sale, targetSale.id, {
        totalAmount: Number(targetSale.totalAmount) + movedTotal,
      });

      // Transfer log
      await this.createTransferLogEntry(manager, {
        transferType: 'ITEM_TRANSFER',
        sourceTableId: sourceSale.tableId,
        sourceTableName: sourceSale.tableName,
        sourceSubCheckId: sourceSale.id,
        sourceSubCheckLabel: sourceSale.subCheckLabel,
        targetTableId: targetSale.tableId,
        targetTableName: targetSale.tableName,
        targetSubCheckId: targetSale.id,
        targetSubCheckLabel: targetSale.subCheckLabel,
        userId,
        amountBefore: Number(sourceSale.totalAmount),
        amountAfter: Math.max(0, Number(sourceSale.totalAmount) - movedTotal),
        companyId: sourceSale.companyId || 1,
      });

      // WebSocket bildirim
      this.kitchenGateway.notifySaleUpdate(sourceSale);
      this.kitchenGateway.notifySaleUpdate(targetSale);

      const updatedSource = await manager.findOne(Sale, { where: { id: sourceSale.id }, relations: ['items'] }) as Sale;
      const updatedTarget = await manager.findOne(Sale, { where: { id: targetSale.id }, relations: ['items'] }) as Sale;

      return { source: updatedSource, target: updatedTarget };
    });
  }

  /**
   * Alt adisyonu komple başka masaya transfer et.
   * Hedef masada yeni alt adisyon oluşturur.
   */
  async transferSubCheckToTable(body: {
    subCheckId: number;
    targetTableId: number;
    confirmed?: boolean;
  }, userId: number): Promise<any> {
    return await this.saleRepository.manager.transaction(async (manager) => {
      // 1. Kaynak alt adisyonu al
      const sourceSale = await manager.findOne(Sale, {
        where: { id: body.subCheckId },
        relations: ['items', 'table'],
      });
      if (!sourceSale) throw new NotFoundException('Kaynak alt adisyon bulunamadı.');

      // Kapalı veya ödenmiş adisyon kontrolü
      if (sourceSale.status === 'COMPLETED' || sourceSale.status === 'CANCELLED') {
        throw new BadRequestException('Kapalı veya iptal edilmiş alt adisyon transfer edilemez.');
      }

      // Kısmen ödenmiş kontrolü
      if (sourceSale.items) {
        const hasPaidItems = sourceSale.items.some(i => i.isPaid);
        if (hasPaidItems) {
          throw new BadRequestException('Kısmen ödenmiş alt adisyon transfer edilemez.');
        }
      }

      // 2. Hedef masayı al
      const targetTable = await manager.findOne(Table, { where: { id: body.targetTableId, isDeleted: false } });
      if (!targetTable) throw new NotFoundException('Hedef masa bulunamadı.');

      if (sourceSale.tableId === body.targetTableId) {
        throw new BadRequestException('Alt adisyon aynı masaya transfer edilemez.');
      }

      // 3. Dolu masa onayı
      if (targetTable.status === 'DOLU' && !body.confirmed) {
        return { requireConfirmation: true, message: 'Dolu bir masaya taşıma yapıyorsunuz. Onaylıyor musunuz?' };
      }

      // 4. Transfer kodu oluştur
      const transferCode = this.generateTransferCode(sourceSale.tableId, sourceSale.subCheckIndex || 0);

      // 5. Hedef masada parent sale bul
      let targetParentSale = await manager.findOne(Sale, {
        where: { tableId: body.targetTableId, parentSaleId: null as any, status: In(['NEW', 'PREPARATION', 'READY', 'SERVED']) },
        relations: ['subChecks'],
      });

      let targetSubSale: Sale;
      const sourceLabel = sourceSale.subCheckLabel || `Adisyon ${sourceSale.subCheckIndex + 1}`;
      const newLabel = `${sourceSale.tableName || 'Paket'} / ${sourceLabel}'den Taşınan`;

      if (!targetParentSale) {
        targetParentSale = manager.create(Sale, {
          tableId: body.targetTableId,
          tableName: targetTable.name,
          waiterId: sourceSale.waiterId,
          userId: sourceSale.userId,
          partnerId: sourceSale.partnerId,
          companyId: sourceSale.companyId,
          status: 'NEW',
          totalAmount: 0,
          discountAmount: 0,
          serviceFee: 0,
          subCheckLabel: newLabel,
          subCheckIndex: 0,
          transferredFromTableId: sourceSale.tableId,
          transferredFromTableName: sourceSale.tableName,
          transferCode,
          transferredByUserId: userId,
          createdByUserId: sourceSale.createdByUserId || sourceSale.userId,
        });
        targetParentSale = await manager.save(Sale, targetParentSale);
        targetSubSale = targetParentSale;
      } else {
        // 6. Hedef masada yeni alt adisyon oluştur
        const existingCount = await manager.count(Sale, { where: { parentSaleId: targetParentSale.id } });
        const subCheckIndex = existingCount + 1;

        const newSubCheck = manager.create(Sale, {
          parentSaleId: targetParentSale.id,
          subCheckLabel: newLabel,
          subCheckIndex,
          tableId: body.targetTableId,
          tableName: targetTable.name,
          waiterId: sourceSale.waiterId,
          userId: sourceSale.userId,
          partnerId: sourceSale.partnerId,
          companyId: sourceSale.companyId,
          status: sourceSale.status || 'NEW',
          totalAmount: 0,
          discountAmount: 0,
          serviceFee: 0,
          transferredFromTableId: sourceSale.tableId,
          transferredFromTableName: sourceSale.tableName,
          transferCode,
          transferredByUserId: userId,
          createdByUserId: sourceSale.createdByUserId || sourceSale.userId,
        });
        targetSubSale = await manager.save(Sale, newSubCheck);
      }

      // 7. Tüm item'ları yeni alt adisyona taşı
      if (sourceSale.items && sourceSale.items.length > 0) {
        for (const item of sourceSale.items) {
          await manager.query(`UPDATE sale_items SET saleId = ${targetSubSale.id} WHERE id = ${item.id}`);
        }
      }

      const movedTotal = Number(sourceSale.totalAmount);

      // 8. Kaynak alt adisyonu temizle
      await manager.update(Sale, sourceSale.id, { totalAmount: 0, status: 'CANCELLED' });

      // Update targetSubSale's totalAmount
      await manager.update(Sale, targetSubSale.id, { totalAmount: movedTotal });

      // Target parent total güncelle
      await manager.update(Sale, targetParentSale.id, {
        totalAmount: Number(targetParentSale.totalAmount || 0) + movedTotal,
      });

      // 9. Masa durumlarını güncelle
      await manager.update(Table, body.targetTableId, {
        status: 'DOLU',
        currentTotal: Number(targetTable.currentTotal || 0) + movedTotal,
      });

      // Kaynak masa
      if (sourceSale.tableId) {
        const sourceTable = await manager.findOne(Table, { where: { id: sourceSale.tableId } });
        if (sourceTable) {
          const newSourceTableTotal = Math.max(0, Number(sourceTable.currentTotal || 0) - movedTotal);
          const remainingItems = await manager.query(`
            SELECT COUNT(*) as cnt FROM sale_items si
            JOIN sales s ON s.id = si.saleId
            WHERE s.tableId = ${sourceSale.tableId} AND s.status IN ('NEW','PREPARATION','READY','SERVED') AND si.status = 'ACTIVE'
          `);
          const hasItems = Number(remainingItems[0]?.cnt || 0) > 0;

          await manager.update(Table, sourceSale.tableId, {
            status: hasItems ? 'DOLU' : 'BOŞ',
            currentTotal: hasItems ? newSourceTableTotal : 0,
            waiterName: hasItems ? sourceTable.waiterName : '',
            orderStartTime: hasItems ? sourceTable.orderStartTime : (null as any),
          });
        }
      }

      // 10. Transfer log
      const transferredItemsList = (sourceSale.items || []).map(i => ({
        productId: i.productId, quantity: Number(i.quantity), total: Number(i.total),
      }));

      await this.createTransferLogEntry(manager, {
        transferType: 'SUBCHECK_TRANSFER',
        sourceTableId: sourceSale.tableId,
        sourceTableName: sourceSale.tableName,
        sourceSubCheckId: sourceSale.id,
        sourceSubCheckLabel: sourceLabel,
        targetTableId: body.targetTableId,
        targetTableName: targetTable.name,
        targetSubCheckId: targetSubSale.id,
        targetSubCheckLabel: newLabel,
        transferredItems: JSON.stringify(transferredItemsList),
        userId,
        amountBefore: movedTotal,
        amountAfter: 0,
        transferCode,
        companyId: sourceSale.companyId || 1,
      });

      // 11. WebSocket bildirim
      const cleanSource = await manager.findOne(Sale, { where: { id: sourceSale.id }, relations: ['items'] });
      const cleanTarget = await manager.findOne(Sale, { where: { id: targetSubSale.id }, relations: ['items'] });
      if (cleanSource) this.kitchenGateway.notifySaleUpdate(cleanSource);
      if (cleanTarget) this.kitchenGateway.notifySaleUpdate(cleanTarget);

      return {
        success: true,
        transferCode,
        sourceSubCheck: { id: sourceSale.id, status: 'CANCELLED' },
        targetSubCheck: { id: targetSubSale.id, label: newLabel, total: movedTotal },
      };
    });
  }

  /**
   * Tüm masayı başka masaya transfer et.
   * Kaynak masadaki tüm açık alt adisyonlar hedef masaya taşınır.
   */
  async transferTable(body: {
    sourceTableId: number;
    targetTableId: number;
    confirmed?: boolean;
  }, userId: number): Promise<any> {
    return await this.saleRepository.manager.transaction(async (manager) => {
      // 1. Kaynak ve hedef masaları al
      const sourceTable = await manager.findOne(Table, { where: { id: body.sourceTableId, isDeleted: false } });
      const targetTable = await manager.findOne(Table, { where: { id: body.targetTableId, isDeleted: false } });
      if (!sourceTable) throw new NotFoundException('Kaynak masa bulunamadı.');
      if (!targetTable) throw new NotFoundException('Hedef masa bulunamadı.');

      if (body.sourceTableId === body.targetTableId) {
        throw new BadRequestException('Aynı masaya transfer yapılamaz.');
      }

      // 2. Yetki Kontrolü
      if (userId) {
          const cached = getCachedPerms(userId);
          const isSuper = cached?.roleName === 'ADMIN' || cached?.roleName === 'ADMINISTRATOR';
          if (!isSuper && !cached?.allUserPerms?.includes('OP:CAN_TRANSFER')) {
              throw new BadRequestException('Transfer yapma yetkiniz bulunmamaktadır.');
          }
      }

      // 3. Dolu masa onayı
      if (targetTable.status === 'DOLU' && !body.confirmed) {
        return { requireConfirmation: true, message: 'Dolu bir masaya taşıma yapıyorsunuz. Onaylıyor musunuz?' };
      }

      // 3. Kaynak masadaki tüm açık satışları al
      const sourceSales = await manager.find(Sale, {
        where: {
          tableId: body.sourceTableId,
          status: In(['NEW', 'PREPARATION', 'READY', 'SERVED']),
        },
        relations: ['items', 'subChecks', 'subChecks.items'],
      });

      if (sourceSales.length === 0) {
        throw new BadRequestException('Kaynak masada taşınacak adisyon bulunamadı.');
      }

      // 4. Kısmen ödenmiş kontrolü
      for (const sale of sourceSales) {
        const allItems = [...(sale.items || [])];
        if (sale.subChecks) {
          sale.subChecks.forEach(sub => {
            allItems.push(...(sub.items || []));
          });
        }
        const hasPaidItems = allItems.some(i => i.isPaid);
        if (hasPaidItems) {
          throw new BadRequestException('Kısmen ödenmiş alt adisyon bulunduğundan masa transferi yapılamaz.');
        }
      }

      // 5. Transfer kodu
      const transferCode = this.generateTransferCode(body.sourceTableId, 0);

      // 6. Hedef masada parent sale bul
      let targetParentSale = await manager.findOne(Sale, {
        where: { tableId: body.targetTableId, parentSaleId: null as any, status: In(['NEW', 'PREPARATION', 'READY', 'SERVED']) },
        relations: ['subChecks'],
      });

      let totalMovedAmount = 0;
      const allTransferredItems: any[] = [];

      // 7. Her açık alt adisyonu taşı
      const allChecksToTransfer: Sale[] = [];
      for (const rootSale of sourceSales) {
        // Kök adisyonu listeye ekle (eğer item'ları varsa)
        if (rootSale.items && rootSale.items.length > 0) {
          allChecksToTransfer.push(rootSale);
        }
        // Alt adisyonları ekle
        if (rootSale.subChecks) {
          for (const sub of rootSale.subChecks) {
            if (sub.status !== 'COMPLETED' && sub.status !== 'CANCELLED') {
              allChecksToTransfer.push(sub);
            }
          }
        }
      }

      for (const check of allChecksToTransfer) {
        const checkLabel = check.subCheckLabel || `Adisyon ${check.subCheckIndex + 1}`;
        const newLabel = `${sourceTable.name} / ${checkLabel}'den Taşınan`;

        let targetSubSale: Sale;

        if (!targetParentSale) {
          // Boş masa, ilk gelen adisyon kök oluyor
          targetParentSale = manager.create(Sale, {
            tableId: body.targetTableId,
            tableName: targetTable.name,
            waiterId: check.waiterId,
            userId: check.userId,
            cashRegisterId: check.cashRegisterId,
            shiftId: check.shiftId,
            partnerId: check.partnerId,
            companyId: check.companyId,
            status: check.status || 'NEW',
            totalAmount: 0,
            discountAmount: 0,
            serviceFee: 0,
            subCheckLabel: newLabel,
            subCheckIndex: 0,
            parentSaleId: null as any,
            transferredFromTableId: body.sourceTableId,
            transferredFromTableName: sourceTable.name,
            transferCode,
            transferredByUserId: userId,
            createdByUserId: check.createdByUserId || check.userId,
          });
          targetParentSale = await manager.save(Sale, targetParentSale);
          targetSubSale = targetParentSale;
        } else {
          // Hedef masa dolu veya ilk adisyon eklendi, diğerleri alt adisyon oluyor
          const existingCount = await manager.count(Sale, { where: { parentSaleId: targetParentSale.id } });
          targetSubSale = manager.create(Sale, {
            parentSaleId: targetParentSale.id,
            subCheckLabel: newLabel,
            subCheckIndex: existingCount + 1,
            tableId: body.targetTableId,
            tableName: targetTable.name,
            waiterId: check.waiterId,
            userId: check.userId,
            cashRegisterId: check.cashRegisterId,
            shiftId: check.shiftId,
            partnerId: check.partnerId,
            companyId: check.companyId,
            status: check.status || 'NEW',
            totalAmount: 0,
            discountAmount: 0,
            serviceFee: 0,
            transferredFromTableId: body.sourceTableId,
            transferredFromTableName: sourceTable.name,
            transferCode,
            transferredByUserId: userId,
            createdByUserId: check.createdByUserId || check.userId,
          });
          targetSubSale = await manager.save(Sale, targetSubSale);
        }

        const itemsToMove = check.items || [];
        if (itemsToMove.length === 0) continue;

        let checkMovedAmount = 0;
        const newItems: SaleItem[] = [];

        for (const item of itemsToMove) {
          await manager.query(`UPDATE sale_items SET saleId = ${targetSubSale.id} WHERE id = ${item.id}`);
          const itemTotal = Number(item.total || Number(item.unitPrice) * Number(item.quantity));
          checkMovedAmount += itemTotal;
          allTransferredItems.push({
            productId: item.productId,
            name: item.productTypeName || 'Ürün',
            quantity: Number(item.quantity),
            total: itemTotal,
          });
          newItems.push({ ...item, sale: targetSubSale } as SaleItem); // Update local reference for the object
        }

        totalMovedAmount += checkMovedAmount;

        // Update targetSubSale totals
        await manager.update(Sale, targetSubSale.id, { totalAmount: checkMovedAmount });

        // Kaynak alt adisyonu kapat
        await manager.update(Sale, check.id, { totalAmount: 0, status: 'CANCELLED' });
      }

      // 8. Kaynak kök adisyonları da kapat
      for (const rootSale of sourceSales) {
        await manager.update(Sale, rootSale.id, { totalAmount: 0, status: 'CANCELLED' });
      }

      // Hedef parent total güncelle
      await manager.update(Sale, targetParentSale!.id, {
        totalAmount: Number(targetParentSale!.totalAmount || 0) + totalMovedAmount,
      });

      // 9. Masa durumlarını güncelle
      await manager.update(Table, body.targetTableId, {
        status: 'DOLU',
        currentTotal: Number(targetTable.currentTotal || 0) + totalMovedAmount,
      });

      if (body.sourceTableId) {
        await manager.update(Table, body.sourceTableId, {
          status: 'BOŞ',
          currentTotal: 0,
          waiterName: '',
          orderStartTime: null as any,
        });
      }

      // 10. Transfer log
      await this.createTransferLogEntry(manager, {
        transferType: 'TABLE_TRANSFER',
        sourceTableId: body.sourceTableId,
        sourceTableName: sourceTable.name,
        targetTableId: body.targetTableId,
        targetTableName: targetTable.name,
        transferredItems: JSON.stringify(allTransferredItems),
        userId,
        amountBefore: totalMovedAmount,
        amountAfter: 0,
        transferCode,
        companyId: sourceSales[0]?.companyId || 1,
      });

      // 11. WebSocket bildirim
      const cleanTargetParent = await manager.findOne(Sale, { where: { id: targetParentSale!.id }, relations: ['items', 'subChecks', 'subChecks.items'] });
      if (cleanTargetParent) this.kitchenGateway.notifySaleUpdate(cleanTargetParent);
      this.tablesService.clearCache();

      return {
        success: true,
        transferCode,
        movedSubCheckCount: allChecksToTransfer.length,
        totalMovedAmount,
        sourceTable: { id: body.sourceTableId, name: sourceTable.name, status: 'BOŞ' },
        targetTable: { id: body.targetTableId, name: targetTable.name, status: 'DOLU' },
      };
    });
  }

  /**
   * Transfer log listesi (raporlama/filtreleme)
   */
  async getTransferLogs(filters: {
    startDate?: string;
    endDate?: string;
    sourceTableId?: number;
    targetTableId?: number;
    transferType?: string;
  }): Promise<TransferLog[]> {
    const qb = this.transferLogRepository.createQueryBuilder('tl')
      .orderBy('tl.timestamp', 'DESC');

    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      qb.andWhere('tl.timestamp >= :startDate', { startDate: start });
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('tl.timestamp <= :endDate', { endDate: end });
    }
    if (filters.sourceTableId) {
      qb.andWhere('tl.sourceTableId = :sourceTableId', { sourceTableId: filters.sourceTableId });
    }
    if (filters.targetTableId) {
      qb.andWhere('tl.targetTableId = :targetTableId', { targetTableId: filters.targetTableId });
    }
    if (filters.transferType) {
      qb.andWhere('tl.transferType = :transferType', { transferType: filters.transferType });
    }

    return qb.take(200).getMany();
  }
}
