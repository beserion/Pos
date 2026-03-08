import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Partner } from '../partners/partner.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Partner, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier: Partner;

  @Column({ nullable: true })
  supplierId: number;

  @Column({ default: 'DRAFT' })
  status: string; // DRAFT, SENT, RECEIVED, CANCELLED

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ nullable: true })
  note: string;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, {
    cascade: true,
  })
  items: PurchaseOrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
