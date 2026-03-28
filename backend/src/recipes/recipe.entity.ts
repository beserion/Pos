import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Product } from '../products/product.entity';

@Entity('recipes')
export class Recipe {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('Product', 'recipes', {
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ default: 0 })
  productId: number;

  @ManyToOne('Product', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'ingredientId' })
  ingredient: Product;

  @Column({ nullable: true , default: 0 })
  ingredientId: number;

  @Column('decimal', { precision: 10, scale: 3 , default: 0 })
  quantity: number;

  @Column({ default: 'adet' })
  unit: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
