import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Location } from '../locations/location.entity';
import { Table } from '../tables/table.entity';

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // e.g., "Bahçe", "Teras", "Salon 1"

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Location, (location) => location.zones, {
    onDelete: 'CASCADE',
  })
  location: Location;

  @OneToMany(() => Table, (table) => table.zone)
  tables: Table[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
