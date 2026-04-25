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
import { Printer } from '../printers/printer.entity';

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

  // Ana Üretim Yazıcısı
  @Column({ nullable: true })
  printer1Id: number;

  @ManyToOne(() => Printer, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'printer1Id' })
  printer1: Printer;

  // Bilgi Yazıcısı 1
  @Column({ nullable: true })
  printer2Id: number;

  @ManyToOne(() => Printer, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'printer2Id' })
  printer2: Printer;

  // Bilgi Yazıcısı 2
  @Column({ nullable: true })
  printer3Id: number;

  @ManyToOne(() => Printer, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'printer3Id' })
  printer3: Printer;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
