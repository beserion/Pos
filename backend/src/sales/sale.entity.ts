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
import { SaleItem } from './sale-item.entity';
import { Table } from '../tables/table.entity';
import { User } from '../users/user.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true , default: 0 })
  partnerId: number;

  @Column({ nullable: true , default: 0 })
  userId: number; // Operator / Cashier

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  serviceFee: number;

  @Column({ default: 'COMPLETED' })
  status: string; // NEW, PREPARATION, READY, SERVED, COMPLETED, CANCELLED

  @Column({ nullable: true })
  paymentMethod: string; // CASH, CREDIT_CARD, SPLIT, KASA

  @Column('decimal', { precision: 12, scale: 2, default: 0, nullable: true })
  paidAmountCash: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, nullable: true })
  paidAmountCreditCard: number;

  @ManyToOne(() => Table, { nullable: true })
  @JoinColumn({ name: 'tableId' })
  table: Table;

  @Column({ nullable: true })
  tableId: number;

  @Column({ nullable: true })
  tableName: string;

  @Column({ nullable: true })
  note: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'waiterId' })
  waiter: User;

  @Column({ nullable: true })
  waiterId: number;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];

  @Column({ default: false })
  isEndOfDayClosed: boolean;

  @Column({ nullable: true , default: 0 })
  cashRegisterId: number;

  @Column({ nullable: true , default: 0 })
  shiftId: number;

  // --- İade (Refund) Alanları ---
  @Column('decimal', { precision: 12, scale: 2, default: 0, nullable: true })
  refundAmount: number;

  @Column({ length: 500, nullable: true })
  refundReason: string;

  @Column({ type: 'datetime2', nullable: true })
  refundedAt: Date;

  @Column({ nullable: true , default: 0 })
  refundedByUserId: number;

  @Column({ nullable: true , default: 0 })
  companyId: number;

  // --- Alt Adisyon (Sub-Check) Alanları ---
  @ManyToOne(() => Sale, (sale) => sale.subChecks, { nullable: true })
  @JoinColumn({ name: 'parentSaleId' })
  parentSale: Sale;

  @Column({ nullable: true })
  parentSaleId: number;

  @OneToMany(() => Sale, (sale) => sale.parentSale)
  subChecks: Sale[];

  @Column({ nullable: true, length: 100 })
  subCheckLabel: string;

  @Column({ default: 0 })
  subCheckIndex: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
