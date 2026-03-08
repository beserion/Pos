import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Zone } from '../zones/zone.entity';
import { Employee } from '../employees/employee.entity';
import { Warehouse } from '../warehouses/warehouse.entity';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Zone, (zone) => zone.location)
  zones: Zone[];

  @OneToMany(() => Employee, (employee) => employee.location)
  employees: Employee[];

  @OneToMany(() => Warehouse, (warehouse) => warehouse.location)
  warehouses: Warehouse[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
