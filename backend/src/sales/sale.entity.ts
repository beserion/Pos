import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SaleItem } from './sale-item.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  customerId: number;

  @Column({ nullable: true })
  userId: number; // Cashier / POS Operator

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ default: 'COMPLETED' })
  status: string; // PENDING, COMPLETED, CANCELLED

  @Column({ nullable: true })
  paymentMethod: string; // CASH, CREDIT_CARD, SPLIT

  @Column('decimal', { precision: 12, scale: 2, default: 0, nullable: true })
  paidAmountCash: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, nullable: true })
  paidAmountCreditCard: number;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
