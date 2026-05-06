import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Zone } from './zone.entity';
import { ProductType } from '../product-types/product-type.entity';
import { Warehouse } from '../warehouses/warehouse.entity';
import { OutputProfile } from '../output-profiles/output-profile.entity';

@Entity('zone_mappings')
@Unique(['zoneId', 'productTypeId'])
export class ZoneMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  zoneId: number;

  @ManyToOne(() => Zone, (zone) => zone.mappings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zoneId' })
  zone: Zone;

  @Column()
  productTypeId: number;

  @ManyToOne(() => ProductType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productTypeId' })
  productType: ProductType;

  // Stok düşümü için kaynak depo
  @Column({ nullable: true })
  warehouseId: number;

  @ManyToOne(() => Warehouse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  // Çıktı Profili (Özel Yönlendirme)
  @Column({ nullable: true })
  outputProfileId: number;

  @ManyToOne(() => OutputProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'outputProfileId' })
  outputProfile: OutputProfile;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
