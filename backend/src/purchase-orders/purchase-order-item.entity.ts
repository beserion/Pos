import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { Product } from '../products/product.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder: PurchaseOrder;

  @Column({ default: 0 })
  purchaseOrderId: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ default: 0 })
  productId: number;

  @Column('decimal', { precision: 10, scale: 3 , default: 0 })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ default: 'adet' })
  unit: string;
}
