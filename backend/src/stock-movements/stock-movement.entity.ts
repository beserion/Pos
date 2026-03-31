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

  @Column({ type: 'date', nullable: true })
  businessDate: Date;

  @Column()
  movementType: string;
  // opening_balance, purchase, goods_receipt, count_adjustment, 
  // recipe_consumption, direct_sale_consumption, waste, spoilage, 
  // transfer_out, transfer_in, return_in, return_out, manual_adjustment

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  qtyIn: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  qtyOut: number;

  @Column('decimal', { precision: 12, scale: 4 })
  quantity: number; // Net miktar (in - out)

  @Column({ default: 'adet' })
  unit: string;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  unitCost: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  totalCost: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  qtyBefore: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  stockAfter: number; // qty_after

  @Column({ nullable: true })
  warehouseId: number;

  @ManyToOne('Warehouse', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @Column({ nullable: true })
  documentType: string;

  @Column({ nullable: true })
  documentNo: string;

  @Column({ nullable: true })
  sourceType: string;

  @Column({ nullable: true })
  sourceId: number;

  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  approveUserId: number;

  @Column({ nullable: true })
  reasonCode: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  description: string; // note

  @CreateDateColumn()
  createdAt: Date;
}
