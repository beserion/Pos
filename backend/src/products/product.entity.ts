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

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  sku: string;

  @Column({ nullable: true, unique: true })
  barcode: string;

  @Column('decimal', { precision: 10, scale: 2 , default: 0 })
  price: number;

  @Column({ nullable: true })
  category: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  imageUrl: string;

  @Column({ nullable: true , default: 0 })
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

  // Ürün Cinsi (zorunlu)
  @Column({ nullable: true, default: 0 })
  productTypeId: number;

  @ManyToOne('ProductType', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productTypeId' })
  productType: ProductType;

  // Stok Kartı bazında çıktı profili override (en yüksek öncelik)
  @Column({ nullable: true, default: 0 })
  outputProfileId: number;

  @ManyToOne('OutputProfile', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'outputProfileId' })
  outputProfile: OutputProfile;

  @ManyToOne('Printer', 'products', {
    nullable: true,
    onDelete: 'SET NULL',
  })
  printer: Printer;

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
}
