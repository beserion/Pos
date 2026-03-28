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
import type { InventorySessionLine } from './inventory-session-line.entity';

@Entity('inventory_sessions')
export class InventorySession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'datetime2' })
  sessionDate: Date;

  @Column({ nullable: true })
  warehouseId: number;

  @ManyToOne('Warehouse', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @Column({ default: 'FULL' })
  countType: string;

  @Column({ nullable: true })
  scope: string;

  @Column({ default: 'DRAFT' })
  status: string;

  @Column({ default: false })
  isBlindCount: boolean;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  note: string;

  @Column({ nullable: true })
  createdByUserId: number;

  @Column({ nullable: true })
  approvedByUserId: number;

  @Column({ type: 'datetime2', nullable: true })
  approvedAt: Date;

  @OneToMany('InventorySessionLine', 'session', { cascade: true })
  lines: InventorySessionLine[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
