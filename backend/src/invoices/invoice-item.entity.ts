import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';
import { Product } from '../products/product.entity';
import type { StockCard } from '../stock-cards/stock-card.entity';

/**
 * Fatura Kalemi (§11)
 * Fatura / irsaliye / mal kabul yalnızca stok kartı ile çalışır.
 * Ürün kartı bu ekranlarda kullanılmaz.
 *
 * stockCardId: YENİ ana bağlantı (StockCard)
 * productId: ESKİ bağlantı (geriye uyumluluk, deprecated)
 */
@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column({ default: 0 })
  invoiceId: number;

  // ─── Stok Kartı Bağı (§11 - YENİ, ANA BAĞ) ────────
  @Column({ nullable: true })
  stockCardId: number;

  @ManyToOne('StockCard', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'stockCardId' })
  stockCard: StockCard;

  @Column({ nullable: true })
  stockCardName: string; // Snapshot

  // ─── Ürün Bağı (ESKİ, geriye uyumluluk) ─────────────
  /** @deprecated stockCardId kullanın */
  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true, default: 0 })
  productId: number;

  @Column({ nullable: true })
  productName: string; // Snapshot of name at time of invoice

  // ─── Miktar / Fiyat ─────────────────────────────────
  @Column('decimal', { precision: 10, scale: 2, default: 1 })
  quantity: number;

  @Column({ default: 'adet', nullable: true })
  unit: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  unitPrice: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  vatRate: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  vatAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  lineTotal: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  lineTotalWithVat: number;

  @Column({ nullable: true })
  description: string;
}
