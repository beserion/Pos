import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { RecipesService } from '../recipes/recipes.service';
import { StocksService } from '../stocks/stocks.service';
import { Table } from '../tables/table.entity';
import { User } from '../users/user.entity';
import { KitchenGateway } from './kitchen.gateway';
import { Sale } from '../sales/sale.entity';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private recipesService: RecipesService,
    private stocksService: StocksService,
    private kitchenGateway: KitchenGateway,
    private financeService: FinanceService,
  ) { }

  // Helper to fetch and map products bypassing TypeORM eager relation Cartesian explosion
  private async mapProductsToOrders(orders: Order[]): Promise<Order[]> {
    if (orders.length === 0) return orders;
    const orderItemIds = orders.flatMap(o => o.items?.map(i => i.id) || []);

    if (orderItemIds.length > 0) {
      const rawProducts: any[] = await this.orderRepository.query(`
          SELECT oi.id as orderItemId, p.*
          FROM order_items oi
          JOIN products p ON oi.productId = p.id
          WHERE oi.id IN (${orderItemIds.join(',')})
      `);

      orders.forEach(o => {
        o.items?.forEach(item => {
          const match = rawProducts.find(rp => rp.orderItemId === item.id);
          if (match) {
            item.product = match as any; // Map all product fields dynamically
          }
        });
      });
    }
    return orders;
  }

  async findAll(): Promise<Order[]> {
    const orders = await this.orderRepository.find({
      relations: ['items', 'table', 'waiter'],
      order: { createdAt: 'DESC' },
    });
    return this.mapProductsToOrders(orders);
  }

  async findKitchenOrders(): Promise<Order[]> {
    const orders = await this.orderRepository.find({
      where: { status: In(['NEW', 'IN_PREPARATION']) },
      relations: ['items', 'table', 'waiter'],
      order: { createdAt: 'ASC' },
    });
    return this.mapProductsToOrders(orders);
  }

  async getKitchenCounts(): Promise<{ pending: number; finished: number; total: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.orderRepository.createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(DISTINCT order.id)', 'count')
      .innerJoin('order.items', 'item')
      .innerJoin('item.product', 'product')
      .where('order.createdAt >= :today', { today })
      .andWhere('product.printerId IS NOT NULL')
      .groupBy('order.status')
      .getRawMany();

    let pending = 0;
    let finished = 0;
    let total = 0;

    result.forEach(row => {
      const count = parseInt(row.count, 10);
      total += count;
      if (['NEW', 'IN_PREPARATION'].includes(row.status)) {
        pending += count;
      } else if (['READY', 'SERVED'].includes(row.status)) {
        finished += count;
      }
    });

    return { pending, finished, total };
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'table', 'waiter'],
    });
    if (!order) throw new NotFoundException(`Order with ID ${id} not found`);
    const mapped = await this.mapProductsToOrders([order]);
    return mapped[0];
  }

  async findActiveOrdersByTable(tableId: number): Promise<Order[]> {
    const orders = await this.orderRepository.find({
      where: {
        table: { id: tableId },
        status: In(['NEW', 'IN_PREPARATION', 'READY', 'SERVED'])
      },
      relations: ['items', 'table', 'waiter'],
      order: { createdAt: 'ASC' }
    });
    return this.mapProductsToOrders(orders);
  }

  async markItemAsPaid(itemId: number, paymentMethod: string = 'KASA', partnerId?: number): Promise<OrderItem> {
    const item = await this.orderItemRepository.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException(`OrderItem with ID ${itemId} not found`);
    item.isPaid = true;
    const saved = await this.orderItemRepository.save(item);

    // Write INCOME transaction to account_transactions
    await this.financeService.create({
      amount: Number(item.quantity) * Number(item.unitPrice),
      type: 'INCOME',
      description: `Masa Ödemesi - Kalem #${item.id}`,
      sourceType: 'ORDER_ITEM',
      sourceId: item.id,
      paymentMethod,
      category: 'Satış',
      ...(partnerId ? { partnerId } : {}),
    });

    return saved;
  }

  async markItemsAsPaid(itemIds: number[], paymentMethod: string = 'KASA', partnerId?: number): Promise<void> {
    await this.orderItemRepository.update(itemIds, { isPaid: true });
    const items = await this.orderItemRepository.findByIds(itemIds);
    for (const item of items) {
      await this.financeService.create({
        amount: Number(item.quantity) * Number(item.unitPrice),
        type: 'INCOME',
        description: `Masa Ödemesi - Kalem #${item.id}`,
        sourceType: 'ORDER_ITEM',
        sourceId: item.id,
        paymentMethod,
        category: 'Satış',
        ...(partnerId ? { partnerId } : {}),
      });
    }
  }

  async create(orderData: Partial<Order>): Promise<Order> {
    try {
      console.log('Creating order with data:', JSON.stringify(orderData));
      const { items, ...data } = orderData;

      // 1. Save the order first
      const newOrder = this.orderRepository.create(data);
      const savedOrder = await this.orderRepository.save(newOrder);

      // 2. Save items if present
      if (items && items.length > 0) {
        for (const item of items) {
          const orderItem = this.orderItemRepository.create({
            product: item.product,
            quantity: item.quantity,
            unitPrice: item.unitPrice || (item as any).price,
            note: item.note,
            order: savedOrder,
          });
          await this.orderItemRepository.save(orderItem);
        }
      }

      // 3. Update table status if it's linked
      const tableId = orderData.table?.id || (orderData.table as any);
      if (tableId) {
        const table = await this.orderRepository.manager.findOne(Table, {
          where: { id: tableId },
        });

        if (table) {
          const waiterId =
            (orderData.waiter as any).id ||
            (orderData.waiter as any).sub ||
            orderData.waiter;
          console.log('Looking up waiter with ID:', waiterId);
          const waiter = await this.orderRepository.manager.findOne(User, {
            where: { id: waiterId },
          });

          // For a new order, we update the table
          await this.orderRepository.manager.update(Table, tableId, {
            status: 'DOLU',
            waiterName: waiter
              ? `${waiter.firstName} ${waiter.lastName}`
              : 'Sistem',
            orderStartTime:
              table.status === 'BOŞ' ? new Date() : table.orderStartTime,
            currentTotal:
              Number(table.currentTotal || 0) + Number(savedOrder.totalAmount),
          });
        }
      }

      // 4. Auto-deduct stock based on recipes
      await this.deductStockForOrder(savedOrder);

      const fullOrderConfig = await this.findOne(savedOrder.id);
      this.kitchenGateway.notifyNewOrder(fullOrderConfig);

      return fullOrderConfig;
    } catch (error: any) {
      console.error('ORDER CREATE ERROR:', error.message);
      if (error.query) console.error('SQL QUERY:', error.query);
      if (error.parameters) console.error('SQL PARAMS:', error.parameters);
      throw error;
    }
  }

  async updateStatus(id: number, status: string): Promise<Order> {
    const order = await this.findOne(id);
    order.status = status;
    const updatedOrder = await this.orderRepository.save(order);

    if (status === 'READY') {
      this.kitchenGateway.notifyOrderReady(updatedOrder);
    }

    return updatedOrder;
  }

  async checkoutTableItems(tableId: number, checkoutData: any, userId: number): Promise<void> {
    return await this.orderRepository.manager.transaction(async (manager) => {
      // 1. Fetch active orders
      const activeOrders = await manager.find(Order, {
        where: { table: { id: tableId }, status: In(['NEW', 'IN_PREPARATION', 'READY', 'SERVED']) },
        relations: ['items', 'items.product'],
        order: { createdAt: 'ASC' }
      });

      if (activeOrders.length === 0) {
        throw new BadRequestException('Bu masaya ait aktif sipariş bulunamadı.');
      }

      // 2. Clone paidItems array to track deduction
      const remainingToDeduct = checkoutData.paidItems.map((pi: any) => ({ ...pi }));

      for (const order of activeOrders) {
        let orderModified = false;
        for (const orderItem of order.items) {
          const itemToDeduct = remainingToDeduct.find((pi: any) => pi.productId === orderItem.product.id && pi.quantity > 0);
          if (itemToDeduct) {
            const deductQty = Math.min(orderItem.quantity, itemToDeduct.quantity);
            orderItem.quantity -= deductQty;
            itemToDeduct.quantity -= deductQty;
            orderModified = true;

            if (orderItem.quantity <= 0) {
              await manager.remove(OrderItem, orderItem);
            } else {
              await manager.save(OrderItem, orderItem);
            }
          }
        }

        if (orderModified) {
          const remainingItems = order.items.filter(i => i.quantity > 0);
          if (remainingItems.length === 0) {
            order.status = 'COMPLETED';
            order.totalAmount = 0;
          } else {
            // Recalculate total amount with 10% defaults (assume 1.1 multiplier based on earlier logic)
            order.totalAmount = remainingItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 1.1;
          }
          await manager.save(Order, order);
        }
      }

      // 3. Prevent checkout if user paid items that don't exist in active orders
      const unfulfilled = remainingToDeduct.filter((i: any) => i.quantity > 0);
      if (unfulfilled.length > 0) {
        throw new BadRequestException('Ödenmeye çalışılan bazı ürünler masanın aktif siparişlerinde bulunamadı.');
      }

      // 4. Create Sale Record
      const sale = manager.create(Sale, {
        userId,
        totalAmount: (checkoutData.paidAmountCash + checkoutData.paidAmountCreditCard),
        discountAmount: checkoutData.discountAmount || 0,
        serviceFee: checkoutData.serviceFee || 0,
        status: 'COMPLETED',
        paymentMethod: checkoutData.paymentMethod,
        paidAmountCash: checkoutData.paidAmountCash,
        paidAmountCreditCard: checkoutData.paidAmountCreditCard,
        items: checkoutData.paidItems.map((pi: any) => ({
          productId: pi.productId,
          quantity: pi.quantity,
          unitPrice: pi.unitPrice,
          total: pi.total || (pi.quantity * pi.unitPrice)
        }))
      });
      await manager.save(Sale, sale);

      // 5. Check remaining table total and update Table status
      const updatedOrders = await manager.find(Order, {
        where: { table: { id: tableId }, status: In(['NEW', 'IN_PREPARATION', 'READY', 'SERVED']) }
      });
      const newTableTotal = updatedOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      const table = await manager.findOne(Table, { where: { id: tableId } });

      if (table) {
        if (newTableTotal <= 0 && updatedOrders.length === 0) {
          table.status = 'BOŞ';
          table.waiterName = '';
          (table as any).orderStartTime = null;
          table.currentTotal = 0;
        } else {
          table.currentTotal = newTableTotal;
        }
        await manager.save(Table, table);
      }
    });
  }

  async cancelTableOrders(tableId: number): Promise<void> {
    await this.orderRepository.manager.transaction(async (manager) => {
      // 1. Mark active orders as CANCELLED
      await manager.update(Order,
        { table: { id: tableId }, status: In(['NEW', 'IN_PREPARATION', 'READY', 'SERVED']) },
        { status: 'CANCELLED' }
      );

      // 2. Reset table
      const table = await manager.findOne(Table, { where: { id: tableId } });
      if (table) {
        table.status = 'BOŞ';
        table.waiterName = '';
        (table as any).orderStartTime = null;
        table.currentTotal = 0;
        await manager.save(Table, table);
      }
    });
  }

  async remove(id: number): Promise<void> {
    const order = await this.findOne(id);
    await this.orderRepository.remove(order);
  }

  /**
   * For each item in the order, look up its recipe and deduct ingredient stocks.
   * If a product has no recipe, deduct the product itself from stock.
   */
  private async deductStockForOrder(order: Order): Promise<void> {
    const fullOrder = await this.findOne(order.id);

    for (const item of fullOrder.items) {
      const productId = item.product?.id;
      if (!productId) continue;

      const recipes = await this.recipesService.findByProduct(productId);

      if (recipes.length > 0) {
        // Product has a recipe — deduct ingredients
        for (const recipe of recipes) {
          const deductQty = Number(recipe.quantity) * Number(item.quantity);
          await this.stocksService.deductStock(recipe.ingredientId, deductQty);
        }
      } else {
        // No recipe — deduct the product itself
        await this.stocksService.deductStock(productId, Number(item.quantity));
      }
    }
  }
}
