import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { ProductVariation } from './product-variation.entity';

/**
 * Varyasyon Grubu (§13)
 * Örnek: 'İçki Ölçüsü', 'Boyut'
 */
@Entity('variation_groups')
export class VariationGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // 'İçki Ölçüsü', 'Boyut' vb.

  @Column({ default: true })
  isActive: boolean;

  @OneToMany('ProductVariation', 'variationGroup')
  variations: ProductVariation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
