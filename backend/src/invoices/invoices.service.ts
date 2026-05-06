import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { StockCardsService } from '../stock-cards/stock-cards.service';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    private readonly stockMovementsService: StockMovementsService,
    private readonly stockCardsService: StockCardsService,
    private readonly financeService: FinanceService,
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    type?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ data: Invoice[]; total: number; lastPage: number; stats: any }> {
    const query = this.invoiceRepository.createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .leftJoinAndSelect('items.stockCard', 'stockCard')
      .leftJoinAndSelect('invoice.partner', 'partner')
      .orderBy('invoice.issueDate', 'DESC')
      .addOrderBy('invoice.createdAt', 'DESC');

    if (search) {
      query.andWhere(
        '(invoice.invoiceNumber LIKE :search OR partner.name LIKE :search OR invoice.description LIKE :search)',
        { search: `%${search}%` }
      );
    }
    if (status && status !== 'ALL') query.andWhere('invoice.status = :status', { status });
    if (type && type !== 'ALL') query.andWhere('invoice.invoiceType = :type', { type });
    if (startDate) query.andWhere('invoice.issueDate >= :startDate', { startDate });
    if (endDate) query.andWhere('invoice.issueDate <= :endDate', { endDate });

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const statsQuery = this.invoiceRepository.createQueryBuilder('invoice');
    if (search) {
      statsQuery.leftJoin('invoice.partner', 'partner');
      statsQuery.andWhere(
        '(invoice.invoiceNumber LIKE :search OR partner.name LIKE :search OR invoice.description LIKE :search)',
        { search: `%${search}%` }
      );
    }
    if (status && status !== 'ALL') statsQuery.andWhere('invoice.status = :status', { status });
    if (type && type !== 'ALL') statsQuery.andWhere('invoice.invoiceType = :type', { type });
    if (startDate) statsQuery.andWhere('invoice.issueDate >= :startDate', { startDate });
    if (endDate) statsQuery.andWhere('invoice.issueDate <= :endDate', { endDate });

    statsQuery.select([
      'invoice.invoiceType AS invoiceType',
      'SUM(invoice.grandTotal) AS totalAmount',
      'SUM(invoice.taxAmount) AS totalTax',
      'COUNT(invoice.id) AS count'
    ])
    .groupBy('invoice.invoiceType');

    const statsRaw = await statsQuery.getRawMany();

    const stats = {
      purchaseTotal: 0,
      purchaseCount: 0,
      purchaseVat: 0,
      saleTotal: 0,
      saleCount: 0,
      saleVat: 0
    };

    statsRaw.forEach(row => {
      const typeKey = row.invoicetype || row.invoiceType;
      if (typeKey === 'PURCHASE') {
        stats.purchaseTotal = Number(row.totalamount || row.totalAmount || 0);
        stats.purchaseCount = Number(row.count || 0);
        stats.purchaseVat = Number(row.totaltax || row.totalTax || 0);
      } else if (typeKey === 'SALE') {
        stats.saleTotal = Number(row.totalamount || row.totalAmount || 0);
        stats.saleCount = Number(row.count || 0);
        stats.saleVat = Number(row.totaltax || row.totalTax || 0);
      }
    });

    return {
      data,
      total,
      lastPage: Math.ceil(total / limit),
      stats,
    };
  }

  async findOne(id: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['items', 'items.stockCard', 'partner'],
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
    return invoice;
  }

  async create(data: {
    invoiceNumber: string;
    invoiceType?: string;
    partnerId?: number;
    description?: string;
    issueDate: string;
    dueDate?: string;
    status?: string;
    paymentMethod?: string;
    warehouseLocation?: string;
    discountRate?: number;
    items: {
      stockCardId: number;
      stockCardName?: string;
      quantity: number;
      unit?: string;
      unitPrice: number;
      vatRate?: number;
      discountRate1?: number;
      discountRate2?: number;
      description?: string;
      warehouseId?: number;
    }[];
  }): Promise<Invoice> {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Fatura en az bir kalem içermelidir.');
    }

    let subtotal = 0;
    let totalVat = 0;
    let totalDiscount = 0;

    const itemEntities: InvoiceItem[] = [];
    for (const item of data.items) {
      const q = Number(item.quantity);
      const p = Number(item.unitPrice);
      const lineTotalRaw = q * p;
      
      // Stepped Discount Calculation
      const d1 = Number(item.discountRate1 || 0);
      const d2 = Number(item.discountRate2 || 0);
      
      const priceAfterD1 = p * (1 - d1 / 100);
      const netUnitPrice = priceAfterD1 * (1 - d2 / 100);
      const lineTotalDiscounted = q * netUnitPrice;
      const lineDiscountAmount = lineTotalRaw - lineTotalDiscounted;

      const vatRate = Number(item.vatRate || 0);
      const vatAmount = lineTotalDiscounted * (vatRate / 100);
      const lineTotalWithVat = lineTotalDiscounted + vatAmount;

      subtotal += lineTotalRaw;
      totalVat += vatAmount;
      totalDiscount += lineDiscountAmount;

      const entity = this.invoiceItemRepository.create({
        stockCardId: item.stockCardId,
        stockCardName: item.stockCardName || '',
        warehouseId: item.warehouseId,
        quantity: q,
        unit: item.unit || 'adet',
        unitPrice: p,
        vatRate,
        vatAmount: Math.round(vatAmount * 100) / 100,
        discountRate1: d1,
        discountRate2: d2,
        discountAmount: Math.round(lineDiscountAmount * 100) / 100,
        lineTotal: Math.round(lineTotalRaw * 100) / 100,
        lineTotalWithVat: Math.round(lineTotalWithVat * 100) / 100,
        description: item.description,
      });
      itemEntities.push(entity);
    }

    const grandTotal = subtotal - totalDiscount + totalVat;

    const invoice = this.invoiceRepository.create({
      invoiceNumber: data.invoiceNumber,
      invoiceType: data.invoiceType || 'PURCHASE',
      partnerId: data.partnerId || undefined,
      description: data.description,
      issueDate: data.issueDate as any,
      dueDate: data.dueDate ? (data.dueDate as any) : undefined,
      status: data.status || 'ISSUED',
      paymentMethod: data.paymentMethod || 'CASH',
      warehouseLocation: data.warehouseLocation || 'default',
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(totalVat * 100) / 100,
      totalAmount: Math.round((subtotal + totalVat) * 100) / 100,
      discountRate: data.discountRate || 0, // Keep as reference or 0
      discountAmount: Math.round(totalDiscount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      items: itemEntities,
    });

    const saved = await this.invoiceRepository.save(invoice);
    const savedInvoice = Array.isArray(saved) ? saved[0] : saved;

    const invoiceType = data.invoiceType || 'PURCHASE';
    if (invoiceType === 'PURCHASE' || invoiceType === 'SALE') {
      for (const item of data.items) {
        if (item.stockCardId) {
          const baseQty = await this.stockCardsService.convertToBaseUnit(
            item.stockCardId,
            item.unit || 'adet',
            Number(item.quantity),
          );

          const quantityMultiplier = baseQty / Number(item.quantity || 1);
          
          // Use Net Unit Price for Stock Movement (Cost)
          const d1 = Number(item.discountRate1 || 0);
          const d2 = Number(item.discountRate2 || 0);
          const netUnitPrice = Number(item.unitPrice) * (1 - d1 / 100) * (1 - d2 / 100);

          const baseUnitCost =
            quantityMultiplier !== 0
              ? netUnitPrice / quantityMultiplier
              : netUnitPrice;

          await this.stockMovementsService.createMovement({
            stockCardId: item.stockCardId,
            movementType:
              invoiceType === 'PURCHASE' ? 'purchase' : 'direct_sale_consumption',
            quantity: invoiceType === 'PURCHASE' ? baseQty : -baseQty,
            unit: item.unit || 'adet',
            unitCost: baseUnitCost,
            warehouseId: item.warehouseId,
            sourceType: 'INVOICE',
            sourceId: savedInvoice.id,
            documentNo: savedInvoice.invoiceNumber,
            description: `${
              invoiceType === 'PURCHASE' ? 'Alış' : 'Satış'
            } Faturası: ${savedInvoice.invoiceNumber}`,
          });
        }
      }

      // Add Finance Transaction for Partner Account
      if (savedInvoice.partnerId) {
        await this.financeService.create({
          partnerId: savedInvoice.partnerId,
          amount: savedInvoice.grandTotal,
          type: invoiceType === 'PURCHASE' ? 'EXPENSE' : 'INCOME',
          category: invoiceType === 'PURCHASE' ? 'Alış Faturası' : 'Satış faturası',
          description: `${invoiceType === 'PURCHASE' ? 'Alış' : 'Satış'} Faturası: ${savedInvoice.invoiceNumber}`,
          paymentMethod: savedInvoice.paymentMethod || 'CASH',
          sourceType: 'INVOICE',
          sourceId: savedInvoice.id,
          createdAt: savedInvoice.issueDate || new Date(),
        });
      }
    }

    return this.findOne(savedInvoice.id);
  }

  async seedTestData() {
    const manager = this.invoiceRepository.manager;
    const partners = await manager.query(`SELECT TOP 1 id FROM partners WHERE isDeleted = 0 OR isDeleted IS NULL`);
    const partnerId = partners && partners.length > 0 ? partners[0].id : null;

    const cards = await manager.query(`SELECT TOP 2 id, costPrice FROM stock_cards WHERE isDeleted = 0 OR isDeleted IS NULL`);
    if (!cards || cards.length === 0) {
      return { success: false, msg: 'Stok kartı bulunamadı. Test verisi için stok kartı ekleyin.' };
    }

    const testId = Math.floor(Math.random() * 10000);
    const invoice = this.invoiceRepository.create({
      invoiceNumber: `INV-TEST-${testId}`,
      invoiceType: 'PURCHASE',
      partnerId: partnerId,
      issueDate: new Date() as any,
      status: 'ISSUED',
      paymentMethod: 'CASH',
      description: 'Sistem tarafından test amaçlı eklenmiş fatura.',
      warehouseLocation: 'Merkez',
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      discountRate: 0,
      discountAmount: 0,
      grandTotal: 0,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);
    let subtotal = 0;
    let taxAmount = 0;
    
    for (const c of cards) {
      const q = Math.ceil(Math.random() * 10) + 1;
      const price = parseFloat(c.costPrice) || 100;
      const vat = 20;

      const item = this.invoiceItemRepository.create({
        invoiceId: savedInvoice.id,
        stockCardId: c.id,
        stockCardName: 'Test Ürün',
        quantity: q,
        unitPrice: price,
        vatRate: vat,
        unit: 'adet',
        lineTotal: q * price * (1 + vat / 100)
      });
      await this.invoiceItemRepository.save(item);
      
      subtotal += q * price;
      taxAmount += (q * price * vat) / 100;
      
      await this.stockMovementsService.createMovement({
        stockCardId: c.id,
        movementType: 'purchase',
        quantity: Number(q),
        unit: 'adet',
        unitCost: price,
        sourceType: 'INVOICE',
        sourceId: savedInvoice.id,
        documentNo: savedInvoice.invoiceNumber,
        description: 'Test faturası girişi',
      });
    }

    savedInvoice.subtotal = subtotal;
    savedInvoice.totalAmount = subtotal;
    savedInvoice.taxAmount = taxAmount;
    savedInvoice.grandTotal = subtotal + taxAmount;
    
    await this.invoiceRepository.save(savedInvoice);

    return { success: true, msg: 'Test faturası ve stok girişleri eklendi!', id: savedInvoice.id };
  }

  async updateFull(id: number, data: {
    invoiceNumber?: string;
    invoiceType?: string;
    partnerId?: number;
    description?: string;
    issueDate?: string;
    dueDate?: string;
    status?: string;
    paymentMethod?: string;
    warehouseLocation?: string;
    discountRate?: number;
    items?: {
      stockCardId: number;
      stockCardName?: string;
      quantity: number;
      unit?: string;
      unitPrice: number;
      vatRate?: number;
      discountRate1?: number;
      discountRate2?: number;
      description?: string;
      warehouseId?: number;
    }[];
  }): Promise<Invoice> {
    const existing = await this.findOne(id);

    if (existing.status !== 'CANCELLED') {
      await this.stockMovementsService.deleteMovementsBySource('INVOICE', id);
    }

    if (existing.items && existing.items.length > 0) {
      await this.invoiceItemRepository.delete({ invoiceId: id });
    }

    const items = data.items || [];
    let subtotal = 0;
    let totalVat = 0;
    let totalDiscount = 0;
    const itemEntities: InvoiceItem[] = [];

    for (const item of items) {
      const q = Number(item.quantity) || 0;
      const p = Number(item.unitPrice) || 0;
      const lineTotalRaw = q * p;

      // Stepped Discount Calculation
      const d1 = Number(item.discountRate1 || 0);
      const d2 = Number(item.discountRate2 || 0);
      
      const priceAfterD1 = p * (1 - d1 / 100);
      const netUnitPrice = priceAfterD1 * (1 - d2 / 100);
      const lineTotalDiscounted = q * netUnitPrice;
      const lineDiscountAmount = lineTotalRaw - lineTotalDiscounted;

      const vatRate = Number(item.vatRate || 0);
      const vatAmount = lineTotalDiscounted * (vatRate / 100);
      const lineTotalWithVat = lineTotalDiscounted + vatAmount;

      subtotal += lineTotalRaw;
      totalVat += vatAmount;
      totalDiscount += lineDiscountAmount;

      const entity = this.invoiceItemRepository.create({
        invoiceId: id,
        stockCardId: item.stockCardId,
        stockCardName: item.stockCardName || '',
        warehouseId: item.warehouseId,
        quantity: q,
        unit: item.unit || 'adet',
        unitPrice: p,
        vatRate,
        vatAmount: Math.round(vatAmount * 100) / 100,
        discountRate1: d1,
        discountRate2: d2,
        discountAmount: Math.round(lineDiscountAmount * 100) / 100,
        lineTotal: Math.round(lineTotalRaw * 100) / 100,
        lineTotalWithVat: Math.round(lineTotalWithVat * 100) / 100,
        description: item.description,
      });
      itemEntities.push(entity);
    }

    const grandTotal = subtotal - totalDiscount + totalVat;

    existing.invoiceNumber = data.invoiceNumber || existing.invoiceNumber;
    existing.invoiceType = data.invoiceType || existing.invoiceType;
    existing.partnerId = data.partnerId && data.partnerId !== 0 ? data.partnerId : null;
    existing.description = data.description ?? existing.description;
    
    if (data.issueDate) existing.issueDate = new Date(data.issueDate);
    if (data.dueDate) existing.dueDate = new Date(data.dueDate);
    else existing.dueDate = null;

    existing.status = data.status || existing.status;
    existing.paymentMethod = data.paymentMethod || existing.paymentMethod;
    existing.warehouseLocation = data.warehouseLocation || existing.warehouseLocation;
    existing.subtotal = Math.round(subtotal * 100) / 100;
    existing.taxAmount = Math.round(totalVat * 100) / 100;
    existing.totalAmount = Math.round((subtotal + totalVat) * 100) / 100;
    existing.discountRate = data.discountRate || 0;
    existing.discountAmount = Math.round(totalDiscount * 100) / 100;
    existing.grandTotal = Math.round(grandTotal * 100) / 100;

    await this.invoiceRepository.save(existing);
    if (itemEntities.length > 0) await this.invoiceItemRepository.save(itemEntities);

    // Delete existing Finance Transaction and recreate it via service method
    await this.financeService.removeBySource('INVOICE', id);

    const newType = existing.invoiceType;
    if (existing.status !== 'CANCELLED') {
      for (const item of items) {
        if (item.stockCardId) {
          const baseQty = await this.stockCardsService.convertToBaseUnit(
            item.stockCardId,
            item.unit || 'adet',
            Number(item.quantity),
          );

          const quantityMultiplier = baseQty / Number(item.quantity || 1);
          
          // Use Net Unit Price for Stock Movement (Cost)
          const d1 = Number(item.discountRate1 || 0);
          const d2 = Number(item.discountRate2 || 0);
          const netUnitPrice = Number(item.unitPrice) * (1 - d1 / 100) * (1 - d2 / 100);

          const baseUnitCost =
            quantityMultiplier !== 0
              ? netUnitPrice / quantityMultiplier
              : netUnitPrice;

          await this.stockMovementsService.createMovement({
            stockCardId: item.stockCardId,
            movementType:
              newType === 'PURCHASE' ? 'purchase' : 'direct_sale_consumption',
            quantity: newType === 'PURCHASE' ? baseQty : -baseQty,
            unit: item.unit || 'adet',
            unitCost: baseUnitCost,
            warehouseId: item.warehouseId,
            sourceType: 'INVOICE',
            sourceId: existing.id,
            documentNo: existing.invoiceNumber,
            description: `Fatura Güncelleme (${
              newType === 'PURCHASE' ? 'Alış' : 'Satış'
            }): ${existing.invoiceNumber}`,
          });
        }
      }

      // Recreate Finance Transaction
      if (existing.partnerId) {
        await this.financeService.create({
          partnerId: existing.partnerId,
          amount: existing.grandTotal,
          type: newType === 'PURCHASE' ? 'EXPENSE' : 'INCOME',
          category: newType === 'PURCHASE' ? 'Alış Faturası' : 'Satış faturası',
          description: `${newType === 'PURCHASE' ? 'Alış' : 'Satış'} Faturası: ${existing.invoiceNumber} (Güncelleme)`,
          paymentMethod: existing.paymentMethod || 'CASH',
          sourceType: 'INVOICE',
          sourceId: existing.id,
          createdAt: existing.issueDate || new Date(),
        });
      }
    }

    return this.findOne(id);
  }

  async updateStatus(id: number, status: string): Promise<Invoice> {
    const invoice = await this.findOne(id);
    const oldStatus = invoice.status;
    invoice.status = status;
    await this.invoiceRepository.save(invoice);

    if (oldStatus !== 'CANCELLED' && status === 'CANCELLED') {
      await this.stockMovementsService.deleteMovementsBySource('INVOICE', id);
      await this.financeService.removeBySource('INVOICE', id);
    } else if (oldStatus === 'CANCELLED' && status !== 'CANCELLED') {
      for (const item of invoice.items || []) {
        if (item.stockCardId) {
          await this.stockMovementsService.createMovement({
            stockCardId: item.stockCardId,
            movementType: invoice.invoiceType === 'PURCHASE' ? 'purchase' : 'direct_sale_consumption',
            quantity: invoice.invoiceType === 'PURCHASE' ? Number(item.quantity) : -Number(item.quantity),
            unit: item.unit || 'adet',
            unitCost: Number(item.unitPrice),
            sourceType: 'INVOICE',
            sourceId: invoice.id,
            documentNo: invoice.invoiceNumber,
            description: `Fatura İptal Geri Alma (${invoice.invoiceType === 'PURCHASE' ? 'Alış' : 'Satış'}): ${invoice.invoiceNumber}`,
          });
        }
      }

      // Restore Finance Transaction
      if (invoice.partnerId) {
        await this.financeService.create({
          partnerId: invoice.partnerId,
          amount: invoice.grandTotal,
          type: invoice.invoiceType === 'PURCHASE' ? 'EXPENSE' : 'INCOME',
          category: invoice.invoiceType === 'PURCHASE' ? 'Alış Faturası' : 'Satış faturası',
          description: `${invoice.invoiceType === 'PURCHASE' ? 'Alış' : 'Satış'} Faturası: ${invoice.invoiceNumber} (İptal Geri Alındı)`,
          paymentMethod: invoice.paymentMethod || 'CASH',
          sourceType: 'INVOICE',
          sourceId: invoice.id,
          createdAt: invoice.issueDate || new Date(),
        });
      }
    }
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const invoice = await this.findOne(id);
    if (invoice.status !== 'CANCELLED') {
      await this.stockMovementsService.deleteMovementsBySource('INVOICE', id);
      await this.financeService.removeBySource('INVOICE', id);
    }
    await this.invoiceRepository.delete(id);
  }

  async findByPartner(partnerId: number): Promise<Invoice[]> {
    return await this.invoiceRepository.find({
      where: { partnerId },
      relations: ['items', 'items.stockCard', 'partner'],
      order: { createdAt: 'DESC' },
    });
  }

  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const lastInvoice = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.invoiceNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('invoice.invoiceNumber', 'DESC')
      .getOne();

    let nextNum = 1;
    if (lastInvoice) {
      const lastNum = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    return `${prefix}${String(nextNum).padStart(5, '0')}`;
  }
}
