import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('deliveries')
export class Delivery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 0 })
  saleId: number; // Refers to the Sale that is being delivered

  @Column({ nullable: true , default: 0 })
  courierId: number; // User ID of the courier

  @Column({ default: 'PENDING' })
  status: string; // PENDING, IN_TRANSIT, DELIVERED, CANCELLED

  @Column({ nullable: true })
  deliveryAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true , default: 0 })
  currentLat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true , default: 0 })
  currentLng: number;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'datetime', nullable: true })
  estimatedDeliveryTime: Date;

  @Column({ type: 'datetime', nullable: true })
  actualDeliveryTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
