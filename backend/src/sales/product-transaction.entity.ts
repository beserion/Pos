import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Product } from '../products/product.entity';
import type { User } from '../users/user.entity';

/**
 * Ürün İşlem Geçmişi (§16)
 * Satış operasyon logu - stok değil, satış akışı takibi.
 *
 * İşlem tipleri:
 * ITEM_ADDED, QTY_INCREASED, QTY_DECREASED, VOID, COMP,
 * DISCOUNT, PRICE_OVERRIDE, MODIFIER_ADDED, MODIFIER_REMOVED,
 * MOVED_TO_OTHER_CHECK, REFUND
 */
@Entity('product_transactions')
export class ProductTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  datetime: Date;

  @Column({ type: 'date', nullable: true })
  businessDate: Date;

  // ─── Adisyon Bilgileri ──────────────────────────────
  @Column({ nullable: true })
  checkNo: string; // sale.id → string

  @Column({ nullable: true })
  subCheckNo: string;

  @Column({ default: 0 })
  orderLineNo: number;

  @Column({ nullable: true })
  tableId: number;

  @Column({ nullable: true })
  hallSection: string; // Salon / bölüm

  // ─── Ürün Bilgileri ─────────────────────────────────
  @Column({ nullable: true })
  productId: number;

  @ManyToOne('Product', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  productName: string; // Snapshot

  @Column({ nullable: true })
  variationName: string; // Varyasyon adı

  // ─── Tutar Bilgileri ────────────────────────────────
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  qty: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  unitPrice: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  grossAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  compAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  netAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  // ─── İşlem Tipi ─────────────────────────────────────
  @Column()
  actionType: string;

  // ─── Operatörler ────────────────────────────────────
  @Column({ nullable: true })
  waiterId: number;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'waiterId' })
  waiter: User;

  @Column({ nullable: true })
  cashierId: number;

  @Column({ nullable: true })
  terminalId: string;

  @Column({ nullable: true })
  salesChannel: string; // dine_in, takeaway, delivery, qr

  // ─── Sebep / Not ───────────────────────────────────
  @Column({ nullable: true })
  reasonCode: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  note: string;
}
