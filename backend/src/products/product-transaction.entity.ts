import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_transactions')
export class ProductTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  datetime: Date;

  @Column({ type: 'datetime2', nullable: true })
  businessDate: Date;

  @Column()
  productId: number;

  @Column({ nullable: true })
  productName: string;

  @Column('decimal', { precision: 12, scale: 4 })
  qty: number;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  type: string; // sale, void, return

  @Column({ nullable: true })
  status: string; // completed, cancelled

  @Column({ nullable: true })
  orderId: number;

  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  checkNo: string;

  @Column({ nullable: true })
  tableName: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  note: string;
}
