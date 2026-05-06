import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';
import { StockCard } from '../stock-cards/stock-card.entity';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column({ default: 0 })
  invoiceId: number;

  @ManyToOne(() => StockCard, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'stockCardId' })
  stockCard: StockCard;

  @Column({ nullable: true })
  stockCardId: number;

  @Column({ nullable: true })
  stockCardName: string; // Snapshot of name at time of invoice

  @Column({ nullable: true })
  warehouseId: number;

  @Column('decimal', { precision: 10, scale: 2, default: 1 })
  quantity: number;

  @Column({ default: 'adet', nullable: true })
  unit: string;

  @Column('decimal', { precision: 12, scale: 2 , default: 0 })
  unitPrice: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  vatRate: number; // e.g. 1, 10, 20

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  vatAmount: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  discountRate1: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  discountRate2: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  lineTotal: number; // quantity * unitPrice (brüt)

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  lineTotalWithVat: number; // net + vat

  @Column({ nullable: true })
  description: string;
}
