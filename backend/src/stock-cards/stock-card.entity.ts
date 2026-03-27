import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Warehouse } from '../warehouses/warehouse.entity';

@Entity('stock_cards')
export class StockCard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  barcode: string;

  @Column({ nullable: true })
  category: string;

  @Column({ default: 'adet' })
  baseUnit: string;

  @Column({ nullable: true })
  purchaseUnit: string;

  @Column('decimal', { precision: 10, scale: 4, default: 1 })
  conversionRate: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  costPerBaseUnit: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  currentStock: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  minStockLevel: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  warehouseId: number;

  @ManyToOne('Warehouse', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
