import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { StocksService } from '../stocks/stocks.service';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private stocksService: StocksService,
    private financeService: FinanceService,
  ) { }

  async findAll(): Promise<Order[]> {
    return await this.orderRepository.find({
      relations: ['supplier', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['supplier', 'items', 'items.product'],
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async create(orderData: Partial<Order>): Promise<Order> {
    const newOrder = this.orderRepository.create(orderData);
    return await this.orderRepository.save(newOrder);
  }

  async updateStatus(id: number, status: string): Promise<Order> {
    const order = await this.findOne(id);
    order.status = status;
    return await this.orderRepository.save(order);
  }

  async remove(id: number): Promise<void> {
    const order = await this.findOne(id);
    if (order.status === 'RECEIVED') {
      throw new BadRequestException('Kabul edilmiş siparişler silinemez.');
    }
    await this.orderRepository.remove(order);
  }

  async autoGenerate(): Promise<Order[]> {
    const lowStockProducts = await this.stocksService.checkLowStock();
    if (lowStockProducts.length === 0) return [];

    const items: Partial<OrderItem>[] = lowStockProducts.map(item => ({
      productId: item.productId,
      quantity: item.minStockLevel - item.currentStock,
      unitPrice: item.costPrice,
      unit: item.unit,
    }));

    const totalAmount = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice || 0), 0);
    const order = this.orderRepository.create({
      status: 'DRAFT',
      totalAmount,
      note: 'Otomatik stok tamamlama siparişi',
      items: items as OrderItem[],
    });

    const saved = await this.orderRepository.save(order);
    return [await this.findOne(saved.id)];
  }

  async receive(id: number): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status === 'RECEIVED') throw new BadRequestException('Bu sipariş zaten kabul edilmiş.');
    if (order.status === 'CANCELLED') throw new BadRequestException('İptal edilmiş sipariş kabul edilemez.');

    for (const item of order.items) {
      await this.stocksService.addStock(item.productId, Number(item.quantity));
    }
    order.status = 'RECEIVED';
    return await this.orderRepository.save(order);
  }

  async receiveWithInvoice(
    id: number,
    invoiceData: {
      invoiceNumber?: string;
      invoiceDate?: string;
      invoiceAmount: number;
      paymentStatus?: string;
      paymentMethod?: string;
    },
  ): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status === 'CANCELLED') throw new BadRequestException('İptal edilmiş sipariş kabul edilemez.');

    if (order.status !== 'RECEIVED') {
      for (const item of order.items) {
        await this.stocksService.addStock(item.productId, Number(item.quantity));
      }
    }

    order.status = 'RECEIVED';
    order.invoiceNumber = invoiceData.invoiceNumber ?? null;
    order.invoiceDateStr = invoiceData.invoiceDate ?? null;
    order.invoiceAmount = invoiceData.invoiceAmount;
    order.paymentStatus = invoiceData.paymentStatus || 'UNPAID';
    order.paymentMethod = invoiceData.paymentMethod ?? null;
    const saved = await this.orderRepository.save(order);

    const supplierDesc = order.supplier?.name || `Tedarikçi #${order.supplierId}`;
    await this.financeService.create({
      amount: invoiceData.invoiceAmount,
      type: 'EXPENSE',
      description: `Mal Alımı - ${supplierDesc}${invoiceData.invoiceNumber ? ' | Fatura: ' + invoiceData.invoiceNumber : ''}`,
      sourceType: 'PURCHASE_INVOICE',
      sourceId: order.id,
      paymentMethod: invoiceData.paymentMethod || 'KASA',
      category: 'Satın Alma',
      partnerId: order.supplierId,
    });

    return saved;
  }
}
