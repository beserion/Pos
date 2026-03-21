import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { StocksService } from '../stocks/stocks.service';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    private readonly stocksService: StocksService,
  ) {}

  // onModuleInit kaldırıldı: Önceden her yeniden başlatılmada otomatik seed çalışıyordu
  // ve invoices tablosuna saleId olmadan yazdığı için 'Cannot insert NULL into saleId' hatasına yol açıyordu.
  // seedTestData() manuel olarak çağrılabilir, otomatik çalışıtmayacak.

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
      .leftJoinAndSelect('items.product', 'product')
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
      if (row.invoicetype === 'PURCHASE' || row.invoiceType === 'PURCHASE') {
        stats.purchaseTotal = Number(row.totalamount || row.totalAmount || 0);
        stats.purchaseCount = Number(row.count || 0);
        stats.purchaseVat = Number(row.totaltax || row.totalTax || 0);
      } else if (row.invoicetype === 'SALE' || row.invoiceType === 'SALE') {
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
      relations: ['items', 'items.product', 'partner'],
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
    return invoice;
  }

  /**
   * Create invoice with items. For PURCHASE invoices, auto-add stock.
   */
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
      productId: number;
      productName?: string;
      quantity: number;
      unit?: string;
      unitPrice: number;
      vatRate?: number;
      description?: string;
    }[];
  }): Promise<Invoice> {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Fatura en az bir kalem içermelidir.');
    }

    let subtotal = 0;

    // Calculate subtotal first to derive correct line discounts
    for (const item of data.items) {
      subtotal += Number(item.quantity) * Number(item.unitPrice);
    }

    const discountRate = Number(data.discountRate || 0);
    const discountAmount = subtotal * (discountRate / 100);
    let totalVat = 0;

    const itemEntities: InvoiceItem[] = [];
    for (const item of data.items) {
      const q = Number(item.quantity);
      const p = Number(item.unitPrice);
      const lineTotalRaw = q * p;
      const lineDiscount = lineTotalRaw * (discountRate / 100);
      const lineTotalDiscounted = lineTotalRaw - lineDiscount;

      const vatRate = Number(item.vatRate || 0);
      const vatAmount = lineTotalDiscounted * (vatRate / 100);
      const lineTotalWithVat = lineTotalDiscounted + vatAmount;

      totalVat += vatAmount;

      const entity = this.invoiceItemRepository.create({
        productId: item.productId,
        productName: item.productName || '',
        quantity: q,
        unit: item.unit || 'adet',
        unitPrice: p,
        vatRate,
        vatAmount: Math.round(vatAmount * 100) / 100,
        lineTotal: Math.round(lineTotalRaw * 100) / 100,
        lineTotalWithVat: Math.round(lineTotalWithVat * 100) / 100,
        description: item.description,
      });
      itemEntities.push(entity);
    }

    const totalBeforeDiscount = subtotal + totalVat;
    const grandTotal = subtotal - discountAmount + totalVat;

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
      totalAmount: Math.round(totalBeforeDiscount * 100) / 100,
      discountRate,
      discountAmount: Math.round(discountAmount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      items: itemEntities,
    });

    const saved = await this.invoiceRepository.save(invoice);
    const savedInvoice = Array.isArray(saved) ? saved[0] : saved;

    // Auto process stock for invoices
    const invoiceType = data.invoiceType || 'PURCHASE';
    if (invoiceType === 'PURCHASE' || invoiceType === 'SALE') {
      for (const item of data.items) {
        if (item.productId) {
          if (invoiceType === 'PURCHASE') {
            await this.stocksService.addStock(
              item.productId,
              Number(item.quantity),
              data.warehouseLocation || 'default',
            );
          } else {
            await this.stocksService.deductStock(
              item.productId,
              Number(item.quantity),
              data.warehouseLocation || 'default',
            );
          }
        }
      }
    }

    return this.findOne(savedInvoice.id);
  }

  /**
   * Full update: reverse old stock, delete old items, recalculate, save new items, apply new stock.
   */
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
      productId: number;
      productName?: string;
      quantity: number;
      unit?: string;
      unitPrice: number;
      vatRate?: number;
      description?: string;
    }[];
  }): Promise<Invoice> {
    const existing = await this.findOne(id);

    // 1) Reverse old stock
    if (existing.status !== 'CANCELLED') {
      for (const item of existing.items || []) {
        if (item.productId) {
          try {
            if (existing.invoiceType === 'PURCHASE') {
              await this.stocksService.deductStock(
                item.productId,
                Number(item.quantity),
                existing.warehouseLocation || 'default',
              );
            } else if (existing.invoiceType === 'SALE') {
              await this.stocksService.addStock(
                item.productId,
                Number(item.quantity),
                existing.warehouseLocation || 'default',
              );
            }
          } catch (e) {
            console.error('Error revering stock on update:', e);
          }
        }
      }
    }

    // 2) Delete old items
    if (existing.items && existing.items.length > 0) {
      await this.invoiceItemRepository.delete({ invoiceId: id });
    }

    // 3) Recalculate from new items
    const items = data.items || [];
    let subtotal = 0;
    
    // First pass
    for (const item of items) {
      subtotal += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    }

    const discountRate = Number(data.discountRate || 0);
    const discountAmount = subtotal * (discountRate / 100);

    let totalVat = 0;
    const itemEntities: InvoiceItem[] = [];

    for (const item of items) {
      const q = Number(item.quantity) || 0;
      const p = Number(item.unitPrice) || 0;
      const lineTotalRaw = q * p;
      const lineDiscount = lineTotalRaw * (discountRate / 100);
      const lineTotalDiscounted = lineTotalRaw - lineDiscount;

      const vatRate = Number(item.vatRate || 0);
      const vatAmount = lineTotalDiscounted * (vatRate / 100);
      const lineTotalWithVat = lineTotalDiscounted + vatAmount;

      totalVat += vatAmount;

      const entity = this.invoiceItemRepository.create({
        invoiceId: id,
        productId: item.productId,
        productName: item.productName || '',
        quantity: q,
        unit: item.unit || 'adet',
        unitPrice: p,
        vatRate,
        vatAmount: Math.round(vatAmount * 100) / 100,
        lineTotal: Math.round(lineTotalRaw * 100) / 100,
        lineTotalWithVat: Math.round(lineTotalWithVat * 100) / 100,
        description: item.description,
      });
      itemEntities.push(entity);
    }

    const totalBeforeDiscount = subtotal + totalVat;
    const grandTotal = subtotal - discountAmount + totalVat;

    // 4) Update invoice header fields
    existing.invoiceNumber = data.invoiceNumber || existing.invoiceNumber;
    existing.invoiceType = data.invoiceType || existing.invoiceType;
    existing.partnerId = data.partnerId && data.partnerId !== 0 ? data.partnerId : null;
    existing.description = data.description ?? existing.description;
    
    if (data.issueDate) {
      existing.issueDate = new Date(data.issueDate);
    }
    if (data.dueDate) {
      existing.dueDate = new Date(data.dueDate);
    } else {
      existing.dueDate = null;
    }

    existing.status = data.status || existing.status;
    existing.paymentMethod = data.paymentMethod || existing.paymentMethod;
    existing.warehouseLocation = data.warehouseLocation || existing.warehouseLocation;
    existing.subtotal = Math.round(subtotal * 100) / 100;
    existing.taxAmount = Math.round(totalVat * 100) / 100;
    existing.totalAmount = Math.round(totalBeforeDiscount * 100) / 100;
    existing.discountRate = discountRate;
    existing.discountAmount = Math.round(discountAmount * 100) / 100;
    existing.grandTotal = Math.round(grandTotal * 100) / 100;

    // 5) Save Header
    await this.invoiceRepository.save(existing);

    // 6) Save new items
    if (itemEntities.length > 0) {
      await this.invoiceItemRepository.save(itemEntities);
    }

    // 7) Re-apply stock
    const newType = existing.invoiceType;
    if (existing.status !== 'CANCELLED') {
      for (const item of items) {
        if (item.productId) {
          try {
            if (newType === 'PURCHASE') {
              await this.stocksService.addStock(
                item.productId,
                Number(item.quantity),
                existing.warehouseLocation || 'default',
              );
            } else if (newType === 'SALE') {
              await this.stocksService.deductStock(
                item.productId,
                Number(item.quantity),
                existing.warehouseLocation || 'default',
              );
            }
          } catch (e) {
            console.error('Error applying stock on update:', e);
          }
        }
      }
    }

    return this.findOne(id);
  }

  async updateStatus(id: number, status: string): Promise<Invoice> {
    const invoice = await this.findOne(id);
    const oldStatus = invoice.status;
    invoice.status = status;
    await this.invoiceRepository.save(invoice);

    // If cancelling an active invoice, revert stocks
    if (oldStatus !== 'CANCELLED' && status === 'CANCELLED') {
      for (const item of invoice.items || []) {
        if (item.productId) {
          if (invoice.invoiceType === 'PURCHASE') {
            await this.stocksService.deductStock(item.productId, Number(item.quantity), invoice.warehouseLocation || 'default');
          } else if (invoice.invoiceType === 'SALE') {
            await this.stocksService.addStock(item.productId, Number(item.quantity), invoice.warehouseLocation || 'default');
          }
        }
      }
    }
    // If activating a cancelled invoice, re-apply stocks
    else if (oldStatus === 'CANCELLED' && status !== 'CANCELLED') {
      for (const item of invoice.items || []) {
        if (item.productId) {
          if (invoice.invoiceType === 'PURCHASE') {
            await this.stocksService.addStock(item.productId, Number(item.quantity), invoice.warehouseLocation || 'default');
          } else if (invoice.invoiceType === 'SALE') {
            await this.stocksService.deductStock(item.productId, Number(item.quantity), invoice.warehouseLocation || 'default');
          }
        }
      }
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const invoice = await this.findOne(id);

    // If it was active, reverse stock
    if (invoice.status !== 'CANCELLED') {
      for (const item of invoice.items || []) {
        if (item.productId) {
          if (invoice.invoiceType === 'PURCHASE') {
            await this.stocksService.deductStock(
              item.productId,
              Number(item.quantity),
              invoice.warehouseLocation || 'default',
            );
          } else if (invoice.invoiceType === 'SALE') {
            await this.stocksService.addStock(
              item.productId,
              Number(item.quantity),
              invoice.warehouseLocation || 'default',
            );
          }
        }
      }
    }

    await this.invoiceRepository.delete(id);
  }

  async findByPartner(partnerId: number): Promise<Invoice[]> {
    return await this.invoiceRepository.find({
      where: { partnerId },
      relations: ['items', 'items.product', 'partner'],
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
      const lastNum = parseInt(
        lastInvoice.invoiceNumber.replace(prefix, ''),
        10,
      );
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    return `${prefix}${String(nextNum).padStart(5, '0')}`;
  }

  async seedTestData() {
    const manager = this.invoiceRepository.manager;
    // Query 1 valid partner
    const partners = await manager.query(`SELECT TOP 1 id FROM partner WHERE isDeleted = 0 OR isDeleted IS NULL`);
    const partnerId = partners && partners.length > 0 ? partners[0].id : null;

    // Query 2 valid products
    const products = await manager.query(`SELECT TOP 2 id, price, vatRate FROM product WHERE isDeleted = 0 OR isDeleted IS NULL AND price IS NOT NULL`);
    if (!products || products.length === 0) {
      return { success: false, msg: 'Ürün bulunamadı. Test verisi için ürün ekleyin.' };
    }

    const testId = Math.floor(Math.random() * 10000);
    
    // Create an Invoice
    const invoice = this.invoiceRepository.create({
      invoiceNumber: `INV-TEST-${testId}`,
      invoiceType: 'PURCHASE',
      partnerId: partnerId,
      issueDate: new Date(),
      status: 'ISSUED',
      paymentMethod: 'CASH',
      description: 'Sistem tarafından test amaçlı eklenmiş fatura (ve kalemleri).',
      warehouseLocation: 'Merkez',
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      discountRate: 0,
      discountAmount: 0,
      grandTotal: 0,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Create Items
    let subtotal = 0;
    let taxAmount = 0;
    
    for (const p of products) {
      const q = Math.ceil(Math.random() * 10) + 1;
      const price = parseFloat(p.price) || 100;
      const vat = parseFloat(p.vatRate) || 20;

      const item = this.invoiceItemRepository.create({
        invoiceId: savedInvoice.id,
        productId: p.id,
        quantity: q,
        unitPrice: price,
        vatRate: vat,
        unit: 'adet',
        lineTotal: q * price * (1 + vat / 100)
      });
      await this.invoiceItemRepository.save(item);
      
      subtotal += q * price;
      taxAmount += (q * price * vat) / 100;
      
      // Affect Stock
      await this.stocksService.addStock(p.id, Number(q), 'Merkez');
    }

    savedInvoice.subtotal = subtotal;
    savedInvoice.totalAmount = subtotal;
    savedInvoice.taxAmount = taxAmount;
    savedInvoice.grandTotal = subtotal + taxAmount;
    
    await this.invoiceRepository.save(savedInvoice);

    // Also seed 10 reservations for frontend test:
    try {
      for (let i = 1; i <= 10; i++) {
        const rDate = new Date();
        rDate.setDate(rDate.getDate() + Math.floor(i / 2));
        rDate.setHours(18 + (i % 4), 0, 0, 0);
        const formattedDate = rDate.toISOString().slice(0, 19).replace('T', ' ');

        const statuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'ARRIVED'];
        const randomStatus = statuses[i % 4];

        await manager.query(`
            INSERT INTO reservations (
                customerName, customerPhone, reservationTime, guestCount, notes, status, createdAt, updatedAt
            ) VALUES (
                'Örnek Müşteri ${i}', '+9055500011${String(i).padStart(2, '0')}', '${formattedDate}', ${(i % 5) + 2}, 'Otomatik oluşturulmuş test rezervasyonu', '${randomStatus}', GETDATE(), GETDATE()
            )
        `);
      }
    } catch (e) {
      console.error('Reservation seed error', e);
    }

    return { success: true, msg: 'Test faturası, kalemleri ve 10 örnek rezervasyon başarıyla eklendi!', id: savedInvoice.id };
  }
}
