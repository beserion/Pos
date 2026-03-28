import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { InventorySession } from './inventory-session.entity';
import type { StockCard } from '../stock-cards/stock-card.entity';

@Entity('inventory_session_lines')
export class InventorySessionLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sessionId: number;

  @ManyToOne('InventorySession', 'lines', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: InventorySession;

  @Column()
  stockCardId: number;

  @ManyToOne('StockCard', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stockCardId' })
  stockCard: StockCard;

  @Column({ default: 'adet' })
  unit: string;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  theoreticalQty: number;

  @Column('decimal', { precision: 12, scale: 4, nullable: true })
  countedQty: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  differenceQty: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  unitCost: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  differenceCost: number;

  @Column({ default: false })
  isCounted: boolean;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string;
}
