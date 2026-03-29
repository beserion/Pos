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

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  // ─── Kimlik (§9) ─────────────────────────────────────
  @Column()
  name: string;

  @Column({ unique: true })
  sku: string;

  @Column({ nullable: true, unique: true })
  barcode: string;

  @Column({ nullable: true })
  posName: string; // POS ekranındaki kısa ad

  @Column({ nullable: true })
  kitchenName: string; // Mutfak/bar ekranındaki ad

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  imageUrl: string;

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
  directStockQty: number;

  @Column({ nullable: true })
  directStockUnit: string;

  // Recipe bağı → RecipeHeader üzerinden (product.id = recipeHeader.productId)

  // ─── Operasyon / Yazıcı (§6, §9) ────────────────────
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

  // ─── İlişkiler ──────────────────────────────────────
  @OneToMany('Stock', 'product')
  stocks: Stock[];

  @OneToMany('Recipe', 'product')
  recipes: Recipe[];

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
