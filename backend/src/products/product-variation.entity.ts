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
import type { VariationGroup } from './variation-group.entity';
import type { StockCard } from '../stock-cards/stock-card.entity';
import type { RecipeHeader } from '../recipes/recipe-header.entity';

/**
 * Ürün Varyasyonu (§13)
 * Fiyat katsayısı ile reçete katsayısı birbirinden bağımsız.
 * "duble fiyatı tam 2 kat olmak zorunda değil; reçete 2 kat olabilir ama fiyat 1.7 kat olabilir"
 */
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

  @ManyToOne('VariationGroup', 'variations', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'variationGroupId' })
  variationGroup: VariationGroup;

  @Column()
  variationName: string; // 'yarım', 'tek', 'duble', 'küçük', 'orta', 'büyük'

  // Fiyat: priceFactor VEYA fixedPrice kullanılır
  @Column('decimal', { precision: 10, scale: 2, default: 1.0 })
  priceFactor: number; // Fiyat katsayısı (1.0 = aynı fiyat)

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  fixedPrice: number; // Sabit fiyat (priceFactor yerine)

  // Reçete katsayısı (fiyattan BAĞIMSIZ)
  @Column('decimal', { precision: 10, scale: 2, default: 1.0 })
  recipeFactor: number; // Reçete katsayısı (1.0 = standart)

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
