import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from '../products/product.entity';

@Entity('recipes')
export class Recipe {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, (product) => product.recipes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'ingredientId' })
  ingredient: Product;

  @Column()
  ingredientId: number;

  @Column('decimal', { precision: 10, scale: 3 })
  quantity: number;

  @Column({ default: 'adet' })
  unit: string; // gr, kg, ml, lt, adet

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
