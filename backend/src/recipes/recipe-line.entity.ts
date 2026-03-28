import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { RecipeHeader } from './recipe-header.entity';
import type { StockCard } from '../stock-cards/stock-card.entity';

@Entity('recipe_lines')
export class RecipeLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  recipeHeaderId: number;

  @ManyToOne('RecipeHeader', 'lines', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipeHeaderId' })
  recipeHeader: RecipeHeader;

  @Column()
  stockCardId: number;

  @ManyToOne('StockCard', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stockCardId' })
  stockCard: StockCard;

  @Column('decimal', { precision: 10, scale: 4, default: 0 })
  quantity: number;

  @Column({ default: 'adet' })
  unit: string;

  @Column({ default: true })
  isRequired: boolean;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string;
}
