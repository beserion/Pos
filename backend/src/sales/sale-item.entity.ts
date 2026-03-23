import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Sale } from './sale.entity';

@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saleId' })
  sale: Sale;

  @Column({ default: 0 })
  productId: number;

  @Column('decimal', { precision: 10, scale: 2 , default: 0 })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 , default: 0 })
  unitPrice: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  costPrice: number;

  @Column('decimal', { precision: 12, scale: 2 , default: 0 })
  total: number;

  @Column({ nullable: true })
  note: string;

  @Column({ default: false })
  isPaid: boolean;

  @Column({ default: false })
  isWaiting: boolean;

  @Column({ default: false })
  isMarshed: boolean;

  @Column({ default: false })
  isReady: boolean;

  // --- Durum / İptal / İade ---
  @Column({ length: 20, default: 'ACTIVE' })
  status: string; // ACTIVE, CANCELLED, REFUNDED

  @Column({ length: 500, nullable: true })
  cancelReason: string;

  @Column({ length: 500, nullable: true })
  refundReason: string;

  @Column({ nullable: true , default: 0 })
  cancelledByUserId: number;

  @Column({ nullable: true , default: 0 })
  refundedByUserId: number;
}
