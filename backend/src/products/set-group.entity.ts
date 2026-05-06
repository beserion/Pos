import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { SetMenu } from './set-menu.entity';
import { SetGroupItem } from './set-group-item.entity';

@Entity('set_groups')
export class SetGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SetMenu, (setMenu) => setMenu.groups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'setMenuId' })
  setMenu: SetMenu;

  @Column()
  setMenuId: number;

  @Column()
  groupName: string;

  @Column({ default: 1 })
  minSelect: number;

  @Column({ default: 1 })
  maxSelect: number;

  @Column({ type: 'varchar', length: 20, default: 'PRODUCT' })
  selectionSource: string; // 'CATEGORY' | 'PRODUCT'

  @Column({ default: 0 })
  freeQuantityLimit: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  excessFeeRule: string;

  @OneToMany(() => SetGroupItem, (item) => item.setGroup, { cascade: true })
  items: SetGroupItem[];
}
