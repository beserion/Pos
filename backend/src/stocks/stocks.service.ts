import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Stock } from './stock.entity';
import { Product } from '../products/product.entity';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class StocksService {
  constructor(
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private alertsService: AlertsService,
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    location?: string,
  ): Promise<{ data: Stock[]; total: number; lastPage: number; stats: any }> {
    const query = this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product');

    if (search) {
      query.andWhere(
        '(product.name LIKE :search OR product.sku LIKE :search OR stock.location LIKE :search)',
        { search: `%${search}%` },
      );
    }
    
    if (location) {
      query.andWhere('stock.location = :location', { location });
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Stats calculation (requires looking at all active products/stocks)
    // For large datasets, this might need optimization or a separate query, 
    // but for now we follow the existing pattern in checkLowStock logic.
    const allProducts = await this.productRepository.find({
      where: { isActive: true },
      relations: ['stocks'],
    });

    let totalProducts = 0;
    let warningCount = 0;
    let emptyCount = 0;

    for (const prod of allProducts) {
      totalProducts++;
      const minLevel = Number(prod.minStockLevel || 5);
      const totalStock = (prod.stocks || []).reduce(
        (sum, s) => sum + Number(s.quantity),
        0,
      );

      if (totalStock <= 0) {
        emptyCount++;
      } else if (totalStock <= minLevel) {
        warningCount++;
      }
    }

    return {
      data,
      total,
      lastPage: Math.ceil(total / limit),
      stats: {
        total: totalProducts,
        warning: warningCount,
        empty: emptyCount,
      },
    };
  }

  async findOne(id: number): Promise<Stock> {
    const stock = await this.stockRepository.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!stock) {
      throw new NotFoundException(`Stock with ID ${id} not found`);
    }
    return stock;
  }

  async create(stockData: Partial<Stock> & { productId?: number }): Promise<Stock> {
    const newStock = this.stockRepository.create();
    Object.assign(newStock, stockData);
    if (stockData.productId) {
      newStock.product = { id: stockData.productId } as Product;
    }
    
    if ('expirationDate' in stockData) {
      const expDate: any = stockData.expirationDate;
      if (
        !expDate || 
        expDate === 'null' || 
        (typeof expDate === 'string' && expDate.trim() === '') || 
        (expDate instanceof Date && isNaN(expDate.getTime()))
      ) {
        newStock.expirationDate = null as any;
      } else {
        newStock.expirationDate = new Date(expDate);
      }
    }
    return await this.stockRepository.save(newStock);
  }

  async update(id: number, updateData: Partial<Stock> & { productId?: number }): Promise<Stock> {
    const stock = await this.findOne(id);
    
    // Güvenli assign
    for (const [key, val] of Object.entries(updateData)) {
       if (key !== 'productId' && key !== 'product' && key !== 'expirationDate') {
          (stock as any)[key] = val;
       }
    }

    if (updateData.productId) {
      stock.product = { id: updateData.productId } as Product;
    }
    
    if ('expirationDate' in updateData) {
      const expDate: any = updateData.expirationDate;
      if (
        !expDate || 
        expDate === 'null' || 
        (typeof expDate === 'string' && expDate.trim() === '') || 
        (expDate instanceof Date && isNaN(expDate.getTime()))
      ) {
        stock.expirationDate = null as any;
      } else {
        stock.expirationDate = new Date(expDate);
      }
    }
    
    const saved = await this.stockRepository.save(stock);
    
    // Trigger STOCK_LOW alert if needed
    try {
      const allProductStocks = await this.stockRepository.find({ where: { product: { id: saved.product?.id || updateData.productId } } });
      const totalStock = allProductStocks.reduce((sum: number, s: any) => sum + Number(s.quantity), 0);
      this.alertsService.trigger('STOCK_LOW', {
        relatedId: saved.product?.id,
        numericValue: totalStock,
        description: `Stok miktarı ${totalStock} seviyesine güncellendi!`,
      }).catch(() => {});
    } catch(e) { console.error('Alert error', e); }

    return saved;
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.stockRepository.delete(id);
  }

  /**
   * Deduct stock quantity for a given product. Finds the first available stock record and reduces it.
   */
  async deductStock(
    productId: number,
    quantity: number,
    location?: string,
    manager?: any,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(Stock) : this.stockRepository;
    const where: any = { product: { id: productId } };
    if (location) where.location = location;

    const stocks = await repo.find({
      where,
      order: { quantity: 'DESC' },
    });

    if (stocks.length === 0) {
      // No stock record found — create one with negative value as a warning
      const newStock = repo.create({
        product: { id: productId } as any,
        quantity: -quantity,
        location: location || 'default',
      });
      await repo.save(newStock);
    } else {
      let remaining = quantity;
      for (const stock of stocks) {
        if (remaining <= 0) break;

        const available = Number(stock.quantity);
        const deduct = Math.min(available, remaining);
        stock.quantity = available - deduct;
        remaining -= deduct;
        await repo.save(stock);
      }

      // If there's still remaining, deduct from the first stock (can go negative)
      if (remaining > 0) {
        stocks[0].quantity = Number(stocks[0].quantity) - remaining;
        await repo.save(stocks[0]);
      }
    }

    // Trigger STOCK_LOW alert if needed
    try {
      const allProductStocks = await repo.find({ where: { product: { id: productId } } });
      const totalStock = allProductStocks.reduce((sum: number, s: any) => sum + Number(s.quantity), 0);
      const productRepo = manager ? manager.getRepository(Product) : this.productRepository;
      const product = await productRepo.findOne({ where: { id: productId } });
      
      this.alertsService.trigger('STOCK_LOW', {
        relatedId: productId,
        numericValue: totalStock,
        description: `${product?.name || `Ürün #${productId}`} stok miktarı ${totalStock} adet/birim seviyesine düştü!`,
      }).catch(() => {});
    } catch(e) { console.error('Alert error', e); }
  }

  /**
   * Add stock quantity for a given product (e.g., when receiving a purchase order).
   */
  async addStock(
    productId: number,
    quantity: number,
    location?: string,
    manager?: any,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(Stock) : this.stockRepository;
    const where: any = { product: { id: productId } };
    if (location) where.location = location;

    const stock = await repo.findOne({ where });

    if (stock) {
      stock.quantity = Number(stock.quantity) + quantity;
      await repo.save(stock);
    } else {
      const newStock = repo.create({
        product: { id: productId } as any,
        quantity,
        location: location || 'default',
      });
      await repo.save(newStock);
    }

    // Trigger STOCK_LOW alert if needed
    try {
      const allProductStocks = await repo.find({ where: { product: { id: productId } } });
      const totalStock = allProductStocks.reduce((sum: number, s: any) => sum + Number(s.quantity), 0);
      const productRepo = manager ? manager.getRepository(Product) : this.productRepository;
      const product = await productRepo.findOne({ where: { id: productId } });
      
      this.alertsService.trigger('STOCK_LOW', {
        relatedId: productId,
        numericValue: totalStock,
        description: `${product?.name || `Ürün #${productId}`} stok miktarı ${totalStock} adet/birim seviyesinde!`,
      }).catch(() => {});
    } catch(e) { console.error('Alert error', e); }
  }

  /**
   * Check for products whose total stock is below their minStockLevel.
   */
  async checkLowStock(): Promise<
    {
      productId: number;
      productName: string;
      currentStock: number;
      minStockLevel: number;
      costPrice: number;
      unit: string;
    }[]
  > {
    const products = await this.productRepository.find({
      where: { isActive: true },
      relations: ['stocks'],
    });

    const lowStockItems: {
      productId: number;
      productName: string;
      currentStock: number;
      minStockLevel: number;
      costPrice: number;
      unit: string;
    }[] = [];

    for (const product of products) {
      const minLevel = Number(product.minStockLevel || 0);
      if (minLevel <= 0) continue; // Skip products without minStockLevel set

      const totalStock = (product.stocks || []).reduce(
        (sum, s) => sum + Number(s.quantity),
        0,
      );

      if (totalStock < minLevel) {
        lowStockItems.push({
          productId: product.id,
          productName: product.name,
          currentStock: totalStock,
          minStockLevel: minLevel,
          costPrice: Number(product.costPrice || 0),
          unit: product.unit || 'adet',
        });
      }
    }

    return lowStockItems;
  }
}
