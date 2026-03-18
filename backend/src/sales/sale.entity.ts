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

  @Column({ nullable: true })
  partnerId: number;

  @Column({ nullable: true })
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
