import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { SetGroup } from './set-group.entity';

@Entity('set_menus')
export class SetMenu {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Product, (product) => product.setMenu, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: number;

  @Column({ type: 'varchar', length: 20, default: 'FIX' })
  setType: string; // 'FIX', 'CHOICE', 'BUNDLE'

  @Column({ type: 'float', nullable: true })
  bundleEntitlementLimit: number; // If BUNDLE, total entitlement score

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  showAsParent: boolean;

  @Column({ default: true })
  splitToSubItems: boolean;

  @OneToMany(() => SetGroup, (group) => group.setMenu, { cascade: true, orphanRemoval: true })
  groups: SetGroup[];
}
