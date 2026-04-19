import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Department } from '../departments/department.entity';
import { Printer } from '../printers/printer.entity';

@Entity('cash_registers')
export class CashRegister {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Printer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'receiptPrinterId' })
  receiptPrinter: Printer | null;

  @Column({ nullable: true })
  receiptPrinterId?: number | null;

  @Column({ nullable: true , default: 0 })
  locationId: number;

  @Column('simple-array', { nullable: true })
  zoneIds?: number[];

  @Column('simple-array', { nullable: true })
  allowedPaymentMethods?: string[];

  @Column({ nullable: true, default: 1 })
  companyId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
