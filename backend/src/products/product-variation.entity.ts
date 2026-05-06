import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Product } from './product.entity';
import type { StockCard } from '../stock-cards/stock-card.entity';
import type { RecipeHeader } from '../recipes/recipe-header.entity';

@Entity('product_variations')
export class ProductVariation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @ManyToOne('Product', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  variationGroupId: number;

  @Column({ nullable: true })
  variationName: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  priceFactor: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  fixedPrice: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  recipeFactor: number;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  // --- Yeni Varyant Stok & Reçete Alanları ---
  @Column({
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  inventoryLinkType: string; // none, direct_stock, recipe veya NULL (inherit)

  @Column({ nullable: true })
  linkedStockItemId: number;

  @ManyToOne('StockCard', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linkedStockItemId' })
  linkedStockCard: StockCard;

  @Column('decimal', { precision: 12, scale: 4, nullable: true })
  directStockQty: number;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  directStockUnit: string;

  @Column({ nullable: true })
  recipeHeaderId: number;

  @ManyToOne('RecipeHeader', { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'recipeHeaderId' })
  recipeHeader: RecipeHeader;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  barcode: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
