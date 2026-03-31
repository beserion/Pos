import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StockCard } from '../stock-cards/stock-card.entity';

@Entity('stocks')
export class Stock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  location: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  quantity: number;

  @ManyToOne(() => StockCard, (stockCard) => stockCard.stocks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'stockCardId' })
  stockCard: StockCard;

  @Column({ nullable: true })
  lotNumber: string;

  @Column({ nullable: true })
  barcode: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true })
  expirationDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
