import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductTransaction } from './product-transaction.entity';

@Injectable()
export class ProductTransactionsService {
  constructor(
    @InjectRepository(ProductTransaction)
    private readonly repo: Repository<ProductTransaction>,
  ) {}

  /**
   * Ürün işlem logu oluştur (§16)
   */
  async create(data: Partial<ProductTransaction>): Promise<ProductTransaction> {
    const tx = this.repo.create(data);
    return this.repo.save(tx);
  }

  /**
   * Toplu oluştur (satış kapanışında birden fazla satır)
   */
  async createMany(items: Partial<ProductTransaction>[]): Promise<ProductTransaction[]> {
    const txList = items.map(item => this.repo.create(item));
    return this.repo.save(txList);
  }

  /**
   * Listeleme (sayfalı, filtreli)
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    productId?: number,
    actionType?: string,
    waiterId?: number,
    salesChannel?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ data: ProductTransaction[]; total: number; lastPage: number }> {
    const query = this.repo
      .createQueryBuilder('pt')
      .leftJoinAndSelect('pt.product', 'product')
      .leftJoinAndSelect('pt.waiter', 'waiter');

    if (productId) {
      query.andWhere('pt.productId = :productId', { productId });
    }
    if (actionType) {
      query.andWhere('pt.actionType = :actionType', { actionType });
    }
    if (waiterId) {
      query.andWhere('pt.waiterId = :waiterId', { waiterId });
    }
    if (salesChannel) {
      query.andWhere('pt.salesChannel = :salesChannel', { salesChannel });
    }
    if (startDate) {
      query.andWhere('pt.datetime >= :startDate', { startDate });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.andWhere('pt.datetime <= :endDate', { endDate: end });
    }

    query.orderBy('pt.datetime', 'DESC');

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, lastPage: Math.ceil(total / limit) };
  }

  /**
   * Adisyon bazlı geçmiş (sale id ile)
   */
  async findByCheck(checkNo: string): Promise<ProductTransaction[]> {
    return this.repo.find({
      where: { checkNo },
      relations: ['product', 'waiter'],
      order: { datetime: 'ASC' },
    });
  }

  /**
   * Ürün bazlı geçmiş
   */
  async findByProduct(productId: number): Promise<ProductTransaction[]> {
    return this.repo.find({
      where: { productId },
      relations: ['product', 'waiter'],
      order: { datetime: 'DESC' },
      take: 100,
    });
  }

  /**
   * İşlem tiplerini getir
   */
  async getActionTypes(): Promise<string[]> {
    const result = await this.repo
      .createQueryBuilder('pt')
      .select('DISTINCT pt.actionType', 'actionType')
      .getRawMany();
    return result.map(r => r.actionType).filter(Boolean);
  }
}
