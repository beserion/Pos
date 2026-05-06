import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Stock } from './stock.entity';
import { StockCard } from '../stock-cards/stock-card.entity';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class StocksService {
  constructor(
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    @InjectRepository(StockCard)
    private stockCardRepository: Repository<StockCard>,
    private alertsService: AlertsService,
  ) {}

  /**
   * Find all stock records for a specific location (e.g. "Warehouse #1").
   * Used by InventoryService to get warehouse-based stock levels for counting.
   */
  async findByLocation(location: string): Promise<Stock[]> {
    return this.stockRepository.find({
      where: { location },
      relations: ['stockCard'],
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    location?: string,
  ): Promise<{ data: Stock[]; total: number; lastPage: number; stats: any }> {
    const query = this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.stockCard', 'stockCard');

    if (search) {
      query.andWhere(
        '(stockCard.name LIKE :search OR stockCard.sku LIKE :search OR stock.location LIKE :search)',
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

    // Stats calculation (using StockCard data)
    const allStockCards = await this.stockCardRepository.find({
      where: { isActive: true },
      relations: ['stocks'],
    });

    let totalCards = 0;
    let warningCount = 0;
    let emptyCount = 0;

    for (const card of allStockCards) {
      totalCards++;
      const minLevel = Number(card.minStockLevel || 5);
      const totalStock = (card.stocks || []).reduce(
        (sum: number, s: Stock) => sum + Number(s.quantity),
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
        total: totalCards,
        warning: warningCount,
        empty: emptyCount,
      },
    };
  }

  async findOne(id: number): Promise<Stock> {
    const stock = await this.stockRepository.findOne({
      where: { id },
      relations: ['stockCard'],
    });
    if (!stock) {
      throw new NotFoundException(`Stock with ID ${id} not found`);
    }
    return stock;
  }

  async create(stockData: Partial<Stock> & { stockCardId?: number }): Promise<Stock> {
    const newStock = this.stockRepository.create();
    Object.assign(newStock, stockData);
    if (stockData.stockCardId) {
      newStock.stockCard = { id: stockData.stockCardId } as StockCard;
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

  async update(id: number, updateData: Partial<Stock> & { stockCardId?: number }): Promise<Stock> {
    const stock = await this.findOne(id);
    
    // Güvenli assign
    for (const [key, val] of Object.entries(updateData)) {
       if (key !== 'stockCardId' && key !== 'stockCard' && key !== 'expirationDate') {
          (stock as any)[key] = val;
       }
    }

    if (updateData.stockCardId) {
      stock.stockCard = { id: updateData.stockCardId } as StockCard;
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
      const cardId = saved.stockCard?.id || updateData.stockCardId;
      if (cardId) {
        const allCardStocks = await this.stockRepository.find({ where: { stockCard: { id: cardId } } });
        const totalStock = allCardStocks.reduce((sum: number, s: Stock) => sum + Number(s.quantity), 0);
        this.alertsService.trigger('STOCK_LOW', {
          relatedId: cardId,
          numericValue: totalStock,
          description: `Stok miktarı ${totalStock} seviyesine güncellendi!`,
        }).catch(() => {});
      }
    } catch(e) { console.error('Alert error', e); }

    return saved;
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.stockRepository.delete(id);
  }

  /**
   * Deduct stock quantity for a given stock card. Finds the first available stock record and reduces it.
   */
  async deductStock(
    stockCardId: number,
    quantity: number,
    location?: string,
    manager?: any,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(Stock) : this.stockRepository;
    const where: any = { stockCard: { id: stockCardId } };
    if (location) where.location = location;

    const stocks = await repo.find({
      where,
      order: { quantity: 'DESC' },
    });

    if (stocks.length === 0) {
      // No stock record found — create one with negative value as a warning
      const newStock = repo.create({
        stockCard: { id: stockCardId } as any,
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
      const allCardStocks = await repo.find({ where: { stockCard: { id: stockCardId } } });
      const totalStock = allCardStocks.reduce((sum: number, s: Stock) => sum + Number(s.quantity), 0);
      const cardRepo = manager ? manager.getRepository(StockCard) : this.stockCardRepository;
      const card = await cardRepo.findOne({ where: { id: stockCardId } });
      
      this.alertsService.trigger('STOCK_LOW', {
        relatedId: stockCardId,
        numericValue: totalStock,
        description: `${card?.name || `Stok Kartı #${stockCardId}`} stok miktarı ${totalStock} adet/birim seviyesine düştü!`,
      }).catch(() => {});
    } catch(e) { console.error('Alert error', e); }
  }

  /**
   * Add stock quantity for a given stock card (e.g., when receiving a purchase order).
   */
  async addStock(
    stockCardId: number,
    quantity: number,
    location?: string,
    manager?: any,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(Stock) : this.stockRepository;
    const where: any = { stockCard: { id: stockCardId } };
    if (location) where.location = location;

    const stock = await repo.findOne({ where });

    if (stock) {
      stock.quantity = Number(stock.quantity) + quantity;
      await repo.save(stock);
    } else {
      const newStock = repo.create({
        stockCard: { id: stockCardId } as any,
        quantity,
        location: location || 'default',
      });
      await repo.save(newStock);
    }

    // Trigger STOCK_LOW alert if needed
    try {
      const allCardStocks = await repo.find({ where: { stockCard: { id: stockCardId } } });
      const totalStock = allCardStocks.reduce((sum: number, s: Stock) => sum + Number(s.quantity), 0);
      const cardRepo = manager ? manager.getRepository(StockCard) : this.stockCardRepository;
      const card = await cardRepo.findOne({ where: { id: stockCardId } });
      
      this.alertsService.trigger('STOCK_LOW', {
        relatedId: stockCardId,
        numericValue: totalStock,
        description: `${card?.name || `Stok Kartı #${stockCardId}`} stok miktarı ${totalStock} adet/birim seviyesinde!`,
      }).catch(() => {});
    } catch(e) { console.error('Alert error', e); }
  }

  /**
   * Check for stock cards whose total stock is below their minStockLevel.
   */
  async checkLowStock(): Promise<
    {
      stockCardId: number;
      stockCardName: string;
      currentStock: number;
      minStockLevel: number;
      costPrice: number;
      unit: string;
    }[]
  > {
    const cards = await this.stockCardRepository.find({
      where: { isActive: true },
      relations: ['stocks'],
    });

    const lowStockItems: {
      stockCardId: number;
      stockCardName: string;
      currentStock: number;
      minStockLevel: number;
      costPrice: number;
      unit: string;
    }[] = [];

    for (const card of cards) {
      const minLevel = Number(card.minStockLevel || 0);
      if (minLevel <= 0) continue; // Skip cards without minStockLevel set

      const totalStock = (card.stocks || []).reduce(
        (sum: number, s: Stock) => sum + Number(s.quantity),
        0,
      );

      if (totalStock < minLevel) {
        lowStockItems.push({
          stockCardId: card.id,
          stockCardName: card.name,
          currentStock: totalStock,
          minStockLevel: minLevel,
          costPrice: Number(card.costPerBaseUnit || 0),
          unit: card.baseUnit || 'adet',
        });
      }
    }

    return lowStockItems;
  }
}
