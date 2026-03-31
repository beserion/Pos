import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { StockCard } from '../stock-cards/stock-card.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder: PurchaseOrder;

  @Column({ default: 0 })
  purchaseOrderId: number;

  @ManyToOne(() => StockCard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stockCardId' })
  stockCard: StockCard;

  @Column({ default: 0 })
  stockCardId: number;

  @Column('decimal', { precision: 10, scale: 3 , default: 0 })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ default: 'adet' })
  unit: string;
}
