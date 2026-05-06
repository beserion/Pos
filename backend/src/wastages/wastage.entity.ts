import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StockCard } from '../stock-cards/stock-card.entity';
import { User } from '../users/user.entity';

@Entity('wastages')
export class Wastage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockCard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stockCardId' })
  stockCard: StockCard;

  @Column({ default: 0 })
  stockCardId: number;

  @Column('decimal', { precision: 10, scale: 3 , default: 0 })
  quantity: number;

  @Column({ default: 'adet' })
  unit: string;

  @Column()
  reason: string; // bozulma, düşürme, son kullanma tarihi, diğer

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'recordedById' })
  recordedBy: User;

  @Column({ nullable: true , default: 0 })
  recordedById: number;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;
}
