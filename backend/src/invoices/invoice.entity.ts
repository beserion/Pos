import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InvoiceItem } from './invoice-item.entity';
import { Partner } from '../partners/partner.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  invoiceNumber: string;

  @Column({ default: 'PURCHASE' })
  invoiceType: string; // PURCHASE (alış), SALE (satış)

  @ManyToOne(() => Partner, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'partnerId' })
  partner: Partner;

  @Column({ type: 'int', nullable: true })
  partnerId: number | null;

  @Column({ nullable: true , default: 0 })
  customerId: number; // legacy support

  @Column({ nullable: true, type: 'int' })
  saleId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  subtotal: number; // Sum of line totals before VAT

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  taxAmount: number; // Total VAT

  @Column('decimal', { precision: 12, scale: 2 , default: 0 })
  totalAmount: number; // subtotal + taxAmount

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  discountRate: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  grandTotal: number; // totalAmount - discountAmount

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ default: 'DRAFT' })
  status: string; // DRAFT, ISSUED, PAID, CANCELLED

  @Column({ default: 'CASH', nullable: true })
  paymentMethod: string; // CASH, BANK, CARD

  @Column({ nullable: true })
  warehouseLocation: string; // Which warehouse/location for stock entry

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true, eager: true })
  items: InvoiceItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
