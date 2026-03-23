import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../products/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true , default: 0 })
  productId: number;

  @Column('decimal', { precision: 10, scale: 2 , default: 0 })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 , default: 0 })
  unitPrice: number;

  @Column({ nullable: true })
  unit: string; // kg, lt, adet, vb.

  @Column({ nullable: true })
  note: string;
}
