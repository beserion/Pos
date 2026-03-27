import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { StockCard } from '../stock-cards/stock-card.entity';
import type { Warehouse } from '../warehouses/warehouse.entity';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  stockCardId: number;

  @ManyToOne('StockCard', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stockCardId' })
  stockCard: StockCard;

  @Column()
  movementType: string;
  // PURCHASE, RECIPE_CONSUME, RECIPE_REVERSE, MANUAL_IN, MANUAL_OUT,
  // WASTAGE, STAFF_CONSUME, COMPLIMENTARY, TRANSFER_IN, TRANSFER_OUT,
  // COUNT_SURPLUS, COUNT_DEFICIT, PRODUCTION, PRODUCTION_CONSUME

  @Column('decimal', { precision: 12, scale: 4 })
  quantity: number;

  @Column({ default: 'adet' })
  unit: string;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  unitCost: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  totalCost: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  stockAfter: number;

  @Column({ nullable: true })
  warehouseId: number;

  @ManyToOne('Warehouse', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @Column({ nullable: true })
  referenceType: string;

  @Column({ nullable: true })
  referenceId: number;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  description: string;

  @Column({ nullable: true })
  userId: number;

  @CreateDateColumn()
  createdAt: Date;
}
