import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('company_accounts')
export class CompanyAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // Örn: Akbank Ticari, Merkez Kasa, Garanti POS

  @Column({ default: 'CASH' })
  type: string; // 'CASH', 'BANK', 'CREDIT_CARD'

  @Column({ nullable: true })
  accountNumber: string;

  @Column({ nullable: true })
  iban: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  balance: number;

  @Column({ default: 'TL' })
  currency: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
