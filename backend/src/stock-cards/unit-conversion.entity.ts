import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { StockCard } from './stock-card.entity';

@Entity('unit_conversions')
export class UnitConversion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fromUnit: string;

  @Column()
  toUnit: string;

  @Column('decimal', { precision: 12, scale: 4 })
  multiplier: number;

  @Column({ nullable: true })
  stockCardId: number;

  @ManyToOne('StockCard', { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stockCardId' })
  stockCard: StockCard;

  @CreateDateColumn()
  createdAt: Date;
}
