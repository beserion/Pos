import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SetGroup } from './set-group.entity';
import { Product } from './product.entity';

@Entity('set_group_items')
export class SetGroupItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SetGroup, (group) => group.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'setGroupId' })
  setGroup: SetGroup;

  @Column()
  setGroupId: number;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  productId: number;

  @Column({ nullable: true })
  categoryId: string; // If category selection is chosen

  @Column({ type: 'varchar', length: 20, default: 'INCLUDED' })
  priceMode: string; // 'INCLUDED', 'DIFF_PRICE', 'FIXED_ADD'

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  priceDiff: number;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'float', default: 1 })
  entitlementCost: number;
}
