import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { StocksService } from '../stocks/stocks.service';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private poRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private poItemRepository: Repository<PurchaseOrderItem>,
    private stocksService: StocksService,
    private financeService: FinanceService,
  ) { }

  async findAll(): Promise<PurchaseOrder[]> {
    return await this.poRepository.find({
      relations: ['supplier', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<PurchaseOrder> {
    const po = await this.poRepository.findOne({
      where: { id },
      relations: ['supplier', 'items', 'items.product'],
    });
    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }
    return po;
  }

  async create(poData: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const newPO = this.poRepository.create(poData);
    return await this.poRepository.save(newPO);
  }

  async updateStatus(id: number, status: string): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    po.status = status;
    return await this.poRepository.save(po);
  }

  async remove(id: number): Promise<void> {
    const po = await this.findOne(id);
    if (po.status === 'RECEIVED') {
      throw new BadRequestException('Cannot delete a received purchase order');
    }
    await this.poRepository.remove(po);
  }

  async autoGenerate(): Promise<PurchaseOrder[]> {
    const lowStockProducts = await this.stocksService.checkLowStock();

    if (lowStockProducts.length === 0) {
      return [];
    }

    // Group by no supplier for now — single PO with all low-stock items
    const items: Partial<PurchaseOrderItem>[] = lowStockProducts.map(
      (item) => ({
        productId: item.productId,
        quantity: item.minStockLevel - item.currentStock,
        unitPrice: item.costPrice,
        unit: item.unit,
      }),
    );

    const totalAmount = items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice || 0),
      0,
    );

    const po = this.poRepository.create({
      status: 'DRAFT',
      totalAmount,
      note: 'Otomatik oluşturuldu - Minimum stok seviyesi altı',
      items: items as PurchaseOrderItem[],
    });

    const saved = await this.poRepository.save(po);
    return [await this.findOne(saved.id)];
  }

  async receive(id: number): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (po.status === 'RECEIVED') throw new BadRequestException('This purchase order is already received');
    if (po.status === 'CANCELLED') throw new BadRequestException('Cannot receive a cancelled purchase order');
    for (const item of po.items) {
      await this.stocksService.addStock(item.productId, Number(item.quantity));
    }
    po.status = 'RECEIVED';
    return await this.poRepository.save(po);
  }

  /**
   * Receive a purchase order AND record the invoice (fatura) + write EXPENSE to account_transactions.
   */
  async receiveWithInvoice(
    id: number,
    invoiceData: {
      invoiceNumber?: string;
      invoiceDate?: string;
      invoiceAmount: number;
      paymentStatus?: string;
      paymentMethod?: string;
    },
  ): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (po.status === 'CANCELLED') throw new BadRequestException('Cannot receive a cancelled purchase order');

    // Update stock if not already received
    if (po.status !== 'RECEIVED') {
      for (const item of po.items) {
        await this.stocksService.addStock(item.productId, Number(item.quantity));
      }
    }

    // Save invoice fields
    po.status = 'RECEIVED';
    po.invoiceNumber = invoiceData.invoiceNumber ?? null;
    po.invoiceDateStr = invoiceData.invoiceDate ?? null;
    po.invoiceAmount = invoiceData.invoiceAmount;
    po.paymentStatus = invoiceData.paymentStatus || 'UNPAID';
    po.paymentMethod = invoiceData.paymentMethod ?? null;
    const saved = await this.poRepository.save(po);

    // Write EXPENSE transaction to account_transactions
    const supplierDesc = po.supplier?.name || `Tedarikçi #${po.supplierId}`;
    await this.financeService.create({
      amount: invoiceData.invoiceAmount,
      type: 'EXPENSE',
      description: `Mal Alımı - ${supplierDesc}${invoiceData.invoiceNumber ? ' | Fatura: ' + invoiceData.invoiceNumber : ''
        }`,
      sourceType: 'PURCHASE_INVOICE',
      sourceId: po.id,
      paymentMethod: invoiceData.paymentMethod || 'KASA',
      category: 'Satın Alma',
      partnerId: po.supplierId,
    });

    return saved;
  }
}
