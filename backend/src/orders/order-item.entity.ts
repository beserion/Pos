import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { StockCard } from '../stock-cards/stock-card.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => StockCard)
  @JoinColumn({ name: 'stockCardId' })
  stockCard: StockCard;

  @Column({ nullable: true , default: 0 })
  stockCardId: number;

  @Column('decimal', { precision: 10, scale: 2 , default: 0 })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 , default: 0 })
  unitPrice: number;

  @Column({ nullable: true })
  unit: string; // kg, lt, adet, vb.

  @Column({ nullable: true })
  note: string;
}
