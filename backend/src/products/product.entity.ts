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
  OneToOne,
} from 'typeorm';
import type { Stock } from '../stocks/stock.entity';
import type { Printer } from '../printers/printer.entity';
import type { Recipe } from '../recipes/recipe.entity';
import type { Modifier } from '../modifiers/modifier.entity';
import type { ProductType } from '../product-types/product-type.entity';
import type { OutputProfile } from '../output-profiles/output-profile.entity';
import type { StockCard } from '../stock-cards/stock-card.entity';
import { SetMenu } from './set-menu.entity';
<<<<<<< HEAD
=======
import { StockCard } from '../stock-cards/stock-card.entity';
import { OneToOne } from 'typeorm';
import type { ProductVariation } from './product-variation.entity';
>>>>>>> upstream/server

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  // ─── Kimlik (§9) ─────────────────────────────────────
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

<<<<<<< HEAD
  @Column({ nullable: true })
  posName: string; // POS ekranındaki kısa ad
=======
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;
>>>>>>> upstream/server

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  vatRate: number;

  @Column({ nullable: true })
  kitchenName: string; // Mutfak/bar ekranındaki ad

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

<<<<<<< HEAD
  // ─── Satış (§9) ──────────────────────────────────────
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  vatRate: number; // KDV oranı

  @Column({ default: false })
  openPriceEnabled: boolean; // Açık fiyat

  @Column({ default: true })
  discountAllowed: boolean; // İndirim izni

  @Column({ default: true })
  compAllowed: boolean; // İkram izni

  // ─── Menü / Ekran (§9) ──────────────────────────────
  @Column({ nullable: true })
  productGroup: string; // Ürün grubu (eski: category)

  @Column({ nullable: true })
  productSubgroup: string;

  // Ürün Cinsi - ZORUNLU (§4)
  @Column({ nullable: true })
  productTypeId: number;

  @ManyToOne('ProductType', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productTypeId' })
  productType: ProductType;

  @Column({ default: 0 })
  buttonOrder: number;

  @Column({ nullable: true })
  buttonColor: string;

  // ─── Kanal Uygunluğu (§9) ───────────────────────────
=======
>>>>>>> upstream/server
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

<<<<<<< HEAD
  // ─── Servis Tipi Uygunlukları (§9) ──────────────────
  @Column({ default: true })
  availableForDineIn: boolean; // Masa

  @Column({ default: true })
  availableForTakeaway: boolean; // Gel-al

  @Column({ default: true })
  availableForDelivery: boolean; // Paket/teslimat

  // ─── Stok Bağı (§2, §7) ─────────────────────────────
  // 'none' | 'direct_stock' | 'recipe'
  @Column({ default: 'none' })
  inventoryLinkType: string;

  // Direct Stock alanları (§2.2)
  @Column({ nullable: true })
  linkedStockCardId: number;

  @ManyToOne('StockCard', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linkedStockCardId' })
  linkedStockCard: StockCard;

  @Column('decimal', { precision: 10, scale: 4, default: 0 })
=======
  @Column({
    type: 'nvarchar',
    length: 50,
    default: 'none',
  })
  inventoryLinkType: string; // none, direct_stock, recipe

  @Column({ nullable: true })
  linkedStockItemId: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
>>>>>>> upstream/server
  directStockQty: number;

  @Column({ nullable: true })
  directStockUnit: string;

<<<<<<< HEAD
  // Recipe bağı → RecipeHeader üzerinden (product.id = recipeHeader.productId)

  // ─── Operasyon / Yazıcı (§6, §9) ────────────────────
=======
>>>>>>> upstream/server
  @Column({ nullable: true })
  printerId: number;

  @ManyToOne('Printer', 'products', {
    nullable: true,
    onDelete: 'SET NULL',
  })
  printer: Printer;

  // Çıktı profili override (en yüksek öncelik §6)
  @Column({ nullable: true })
  outputProfileId: number;

  @ManyToOne('OutputProfile', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'outputProfileId' })
  outputProfile: OutputProfile;

  // ─── Eski Alanlar (geriye uyumluluk) ─────────────────
  @Column('decimal', { precision: 10, scale: 2, default: 0, nullable: true })
  costPrice: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, nullable: true })
  minStockLevel: number;

  @Column({ default: 'adet', nullable: true })
  unit: string;

  @Column({ default: false })
  isQuickSale: boolean;

  /** @deprecated inventoryLinkType kullanın */
  @Column({ default: false })
  isIngredient: boolean;

  @Column({ default: false, nullable: true })
  isSet: boolean;

  @OneToOne(() => SetMenu, (setMenu) => setMenu.product, { cascade: true })
  setMenu: SetMenu;

<<<<<<< HEAD
  // ─── İlişkiler ──────────────────────────────────────
  @OneToMany('Stock', 'product')
  stocks: Stock[];
=======
  @Column({ nullable: true })
  stockGroup: string;

  @Column({ nullable: true })
  stockGroupId: number;

  @ManyToOne('StockGroup', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'stockGroupId' })
  stockGroupRelation: any;

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
>>>>>>> upstream/server

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

  // Geriye uyumluluk alias
  get category(): string {
    return this.productGroup;
  }
  set category(val: string) {
    this.productGroup = val;
  }
}
