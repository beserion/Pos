import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { Product } from '../products/product.entity';
import type { RecipeLine } from './recipe-line.entity';

@Entity('recipe_headers')
export class RecipeHeader {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @ManyToOne('Product', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  note: string;

  @OneToMany('RecipeLine', 'recipeHeader', { cascade: true, eager: true })
  lines: RecipeLine[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
