import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import type { Stock } from '../stocks/stock.entity';
import type { Printer } from '../printers/printer.entity';
import type { Recipe } from '../recipes/recipe.entity';
import type { Modifier } from '../modifiers/modifier.entity';
import type { ProductType } from '../product-types/product-type.entity';
import type { OutputProfile } from '../output-profiles/output-profile.entity';
import { SetMenu } from './set-menu.entity';
import { StockCard } from '../stock-cards/stock-card.entity';
import { OneToOne } from 'typeorm';
import type { ProductVariation } from './product-variation.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  sku: string;

  @Column({ nullable: true })
  posName: string;

  @Column({ nullable: true })
  kitchenName: string;

  @Column({ nullable: true })
  barcode: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  vatRate: number;

  @Column({ nullable: true })
  category: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  orderIndex: number;

  @Column({ default: false })
  openPriceEnabled: boolean;

  @Column({ default: true })
  discountAllowed: boolean;

  @Column({ default: true })
  compAllowed: boolean;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  imageUrl: string;

  @Column({ default: true })
  posVisible: boolean;

  @Column({ default: true })
  takeawayVisible: boolean;

  @Column({ default: true })
  deliveryVisible: boolean;

  @Column({ default: true })
  qrVisible: boolean;

  @Column({ default: true })
  kioskVisible: boolean;

  @Column({
    type: 'nvarchar',
    length: 50,
    default: 'none',
  })
  inventoryLinkType: string; // none, direct_stock, recipe

  @Column({ nullable: true })
  linkedStockItemId: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  directStockQty: number;

  @Column({ nullable: true })
  directStockUnit: string;

  @Column({ nullable: true })
  printerId: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, nullable: true })
  costPrice: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, nullable: true })
  minStockLevel: number;

  @Column({ default: 'adet', nullable: true })
  unit: string;

  @Column({ default: false })
  isQuickSale: boolean;

  @Column({ default: false })
  isIngredient: boolean;

  @Column({ default: false, nullable: true })
  isSet: boolean;

  @OneToOne(() => SetMenu, (setMenu) => setMenu.product, { cascade: true })
  setMenu: SetMenu;

  // Ürün Cinsi (zorunlu)
  @Column({ nullable: true })
  productTypeId: number;

  @ManyToOne('ProductType', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productTypeId' })
  productType: ProductType;

  // Stok Kartı bazında çıktı profili override (en yüksek öncelik)
  @Column({ nullable: true })
  outputProfileId: number;

  @ManyToOne('OutputProfile', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'outputProfileId' })
  outputProfile: OutputProfile;

  @ManyToOne('Printer', 'products', {
    nullable: true,
    onDelete: 'SET NULL',
  })
  printer: Printer;

  @ManyToOne('StockCard', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linkedStockItemId' })
  linkedStockCard: StockCard;

  @OneToMany('Recipe', 'product')
  recipes: Recipe[];

  @OneToMany('ProductVariation', 'product', { cascade: true })
  variations: ProductVariation[];

  @ManyToMany('Modifier', { cascade: true })
  @JoinTable({
    name: 'product_modifiers',
    joinColumn: { name: 'productsId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'modifiersId', referencedColumnName: 'id' }
  })
  modifiers: Modifier[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
