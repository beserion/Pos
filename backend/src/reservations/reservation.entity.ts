import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Table } from '../tables/table.entity';
import { Location } from '../locations/location.entity';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ type: 'datetime', nullable: true })
  reservationTime: Date;

  @Column({ default: 1 })
  guestCount: number;

  @ManyToOne(() => Table, { nullable: true, onDelete: 'NO ACTION' })
  table: Table;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'NO ACTION' })
  location: Location;

  @Column({ nullable: true })
  notes: string;

  @Column({ default: 'PENDING' }) // PENDING, CONFIRMED, CANCELLED, ARRIVED
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
