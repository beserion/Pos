import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { CashRegister } from '../cash-registers/cash-register.entity';

@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  cashRegisterId: number;

  @ManyToOne(() => CashRegister, { nullable: false })
  @JoinColumn({ name: 'cashRegisterId' })
  cashRegister: CashRegister;

  @Column({ length: 10 })
  businessDate: string; // 'YYYY-MM-DD'

  @Column({ type: 'datetime2', default: () => 'GETDATE()' })
  openedAt: Date;

  @Column({ type: 'datetime2', nullable: true })
  closedAt: Date;

  @Column({ length: 20, default: 'OPEN' })
  status: string; // OPEN, CLOSED, TRANSFERRED

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  openingCash: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  closingCash: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  expectedCash: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  cashDifference: number;

  @Column({ nullable: true })
  transferredToUserId: number;

  @Column({ length: 500, nullable: true })
  note: string;

  @Column({ default: 1 })
  companyId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
