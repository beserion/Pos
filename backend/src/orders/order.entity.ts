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
import { OrderItem } from './order-item.entity';
import { Partner } from '../partners/partner.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Partner, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier: Partner;

  @Column({ nullable: true })
  supplierId: number;

  @Column({ default: 'DRAFT' })
  status: string; // DRAFT, SENT, RECEIVED, CANCELLED

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ nullable: true })
  note: string;

  // Invoice (Fatura) fields
  @Column({ nullable: true, type: 'nvarchar', length: 100 })
  invoiceNumber: string | null;

  @Column({ nullable: true, type: 'nvarchar', length: 20 })
  invoiceDateStr: string | null;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  invoiceAmount: number;

  @Column({ default: 'UNPAID' })
  paymentStatus: string; // UNPAID, PARTIAL, PAID

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  paymentMethod: string | null; // KASA, BANKA, KREDI_KARTI

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
