import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('closed_day_records')
@Index(['companyId', 'businessDate'], { unique: true })
export class ClosedDayRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { default: 1 })
  companyId: number;

  @Column({ length: 10 })
  businessDate: string; // YYYY-MM-DD

  @Column({ default: true })
  isClosed: boolean;

  @Column({ length: 500, nullable: true })
  note: string;

  @Column('int', { default: 0 })
  rolledOverByUserId: number;

  @Column({ type: 'datetime2', nullable: true })
  rolledOverAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
