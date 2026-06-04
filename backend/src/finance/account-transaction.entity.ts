import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { CompanyAccount } from './company-account.entity';
import { Partner } from '../partners/partner.entity';

@Entity('account_transactions')
export class AccountTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 12, scale: 2 , default: 0 })
  amount: number;

  @Column()
  type: string; // 'INCOME', 'EXPENSE'

  @Column()
  description: string;

  @Column({ nullable: true })
  sourceType: string; // 'SALE', 'REFUND', 'PAYMENT', 'TRANSFER'

  @Column({ nullable: true , default: 0 })
  sourceId: number;

  @Column({ default: 'KASA' })
  paymentMethod: string; // 'KASA', 'BANKA', 'KREDI_KARTI'

  @Column({ default: 'TRY', length: 10 })
  currency: string;

  @Column('decimal', { precision: 12, scale: 4, default: 1.0000 })
  exchangeRate: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0.00 })
  foreignAmount: number;

  @Column({ nullable: true })
  category: string; // 'Satış', 'Alım', 'Gider', 'Maaş', 'Kira' etc.

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true , default: 0 })
  userId: number;

  @ManyToOne(() => Partner, { nullable: true })
  @JoinColumn({ name: 'partnerId' })
  partner: Partner;

  @Column({ nullable: true , default: 0 })
  partnerId: number;

  @ManyToOne(() => CompanyAccount, { nullable: true })
  @JoinColumn({ name: 'companyAccountId' })
  companyAccount: CompanyAccount;

  @Column({ nullable: true , default: 0 })
  companyAccountId: number;

  @Column({ nullable: true })
  shiftId?: number;

  @Column({ nullable: true })
  cashRegisterId?: number;

  @Column({ nullable: true })
  documentNumber: string;

  // ─── Program Tarihi (İş Günü) ─────────────────────────────────────
  // İşlemin ait olduğu program tarihi (YYYY-MM-DD).
  @Column({ length: 10, nullable: true })
  businessDate: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
