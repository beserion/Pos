import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Stock } from '../stocks/stock.entity';
import { Printer } from '../printers/printer.entity';
import { Recipe } from '../recipes/recipe.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  sku: string; // Stock Keeping Unit / Barkod

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  category: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  imageUrl: string; // Ürün görseli

  @Column({ nullable: true })
  printerId: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, nullable: true })
  costPrice: number; // Hammadde birim maliyet fiyatı

  @Column('decimal', { precision: 10, scale: 2, default: 0, nullable: true })
  minStockLevel: number; // Minimum stok seviyesi

  @Column({ default: 'adet', nullable: true })
  unit: string; // gr, kg, ml, lt, adet

  @Column({ default: false })
  isQuickSale: boolean; // Hızlı satış menüsünde görünüp görünmeyeceği

  @Column({ default: false })
  isIngredient: boolean; // Hammadde (reçete bileşeni) olup olmadığı

  @ManyToOne(() => Printer, (printer) => printer.products, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  printer: Printer;

  @OneToMany(() => Stock, (stock) => stock.product)
  stocks: Stock[];

  @OneToMany(() => Recipe, (recipe) => recipe.product)
  recipes: Recipe[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
