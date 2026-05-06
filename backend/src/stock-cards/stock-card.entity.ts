import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { Warehouse } from '../warehouses/warehouse.entity';
import type { Stock } from '../stocks/stock.entity';
import type { StockGroup } from '../stock-groups/stock-group.entity';

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

  @Column({ nullable: true })
  stockGroup: string;

  @Column({ nullable: true })
  stockSubgroup: string;

  @Column({ nullable: true })
  brand: string;

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
  minStockLevel: number; // critical_stock

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  maxStockLevel: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'nvarchar',
    length: 50,
    default: 'traded_good',
  })
  stockNature: string; // raw_material, traded_good, semi_finished, consumable, packaging

  @Column({ nullable: true })
  primaryVendor: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  purchaseVat: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  lastPurchasePrice: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  averageCost: number;

  @Column({ nullable: true })
  sku: string; // SKU / Referans kodu

  @Column({ nullable: true })
  warehouseId: number;

  @ManyToOne('Warehouse', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @Column({ nullable: true })
  outputProfileId: number;

  @ManyToOne('OutputProfile', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'outputProfileId' })
  outputProfile: any;

  @Column({ nullable: true })
  stockGroupId: number;

  @ManyToOne('StockGroup', (group: any) => group.stockCards, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'stockGroupId' })
  stockGroupRelation: any;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  note: string;

  @OneToMany('Stock', (stock: Stock) => stock.stockCard)
  stocks: Stock[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
