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

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column()
  type: string; // 'INCOME', 'EXPENSE'

  @Column()
  description: string;

  @Column({ nullable: true })
  sourceType: string; // 'SALE', 'REFUND', 'PAYMENT', 'TRANSFER'

  @Column({ nullable: true })
  sourceId: number;

  @Column({ default: 'KASA' })
  paymentMethod: string; // 'KASA', 'BANKA', 'KREDI_KARTI'

  @Column({ nullable: true })
  category: string; // 'Satış', 'Alım', 'Gider', 'Maaş', 'Kira' etc.

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: number;

  @ManyToOne(() => Partner, { nullable: true })
  @JoinColumn({ name: 'partnerId' })
  partner: Partner;

  @Column({ nullable: true })
  partnerId: number;

  @ManyToOne(() => CompanyAccount, { nullable: true })
  @JoinColumn({ name: 'companyAccountId' })
  companyAccount: CompanyAccount;

  @Column({ nullable: true })
  companyAccountId: number;

  @Column({ nullable: true })
  documentNumber: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
