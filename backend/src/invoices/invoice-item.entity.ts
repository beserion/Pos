import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';
import { Product } from '../products/product.entity';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column()
  invoiceId: number;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  productId: number;

  @Column({ nullable: true })
  productName: string; // Snapshot of name at time of invoice

  @Column('decimal', { precision: 10, scale: 2, default: 1 })
  quantity: number;

  @Column({ default: 'adet', nullable: true })
  unit: string;

  @Column('decimal', { precision: 12, scale: 2 })
  unitPrice: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  vatRate: number; // e.g. 1, 10, 20

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  vatAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  lineTotal: number; // quantity * unitPrice

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  lineTotalWithVat: number;

  @Column({ nullable: true })
  description: string;
}
