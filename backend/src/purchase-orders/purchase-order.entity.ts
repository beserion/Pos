import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Partner } from '../partners/partner.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';

@Entity('purchase_orders')
export class PurchaseOrder {
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

  // Invoice (Fatura) fields — stored as NVARCHAR for MSSQL compatibility
  @Column({ nullable: true, type: 'nvarchar', length: 100 })
  invoiceNumber: string | null;

  // Store invoice date as string (YYYY-MM-DD) to avoid MSSQL date type issues
  @Column({ nullable: true, type: 'nvarchar', length: 20 })
  invoiceDateStr: string | null;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  invoiceAmount: number;

  @Column({ default: 'UNPAID' })
  paymentStatus: string; // UNPAID, PARTIAL, PAID

  @Column({ nullable: true })
  paymentMethod: string | null; // KASA, BANKA, KREDI_KARTI

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, {
    cascade: true,
  })
  items: PurchaseOrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
