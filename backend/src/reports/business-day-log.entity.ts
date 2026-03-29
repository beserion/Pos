import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('business_day_logs')
@Index(['companyId'])
@Index(['actionType'])
@Index(['createdAt'])
export class BusinessDayLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { default: 1 })
  companyId: number;

  @Column('int', { default: 0 })
  userId: number;

  @Column({ length: 50 })
  actionType: string;
  // END_OF_DAY | CLOSED_DAY_ROLLOVER | SAME_DAY_CONTINUE |
  // TECHNICAL_DATE_FIX | END_OF_DAY_BLOCKED | END_OF_DAY_6H_BLOCKED |
  // OPEN_SHIFT_WARNING | OPEN_SHIFT_OVERRIDE

  @Column({ length: 10, nullable: true })
  oldBusinessDate: string; // YYYY-MM-DD

  @Column({ length: 10, nullable: true })
  newBusinessDate: string; // YYYY-MM-DD

  @Column({ type: 'datetime2', nullable: true })
  systemDate: Date; // İşlem anındaki gerçek sistem tarihi

  @Column({ length: 500, nullable: true })
  note: string;

  @Column('int', { default: 0 })
  openShiftCount: number;

  @Column('int', { default: 0 })
  openCashRegisterCount: number;

  @Column('int', { default: 0 })
  openTableCount: number;

  @Column('int', { nullable: true, default: 0 })
  approvedByUserId: number;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string; // JSON — ek detaylar

  @CreateDateColumn()
  createdAt: Date;
}
