import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('z_reports')
export class ZReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cashRegisterId: number;

  @Column()
  businessDate: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalOpeningCash: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalClosingCash: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalExpectedCash: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalCashDifference: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalIncome: number; // For extra details if needed

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalExpense: number; // For extra details if needed

  @Column('int')
  generatedByUserId: number;

  @Column('int', { default: 1 })
  companyId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
