import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Table } from '../tables/table.entity';
import { Location } from '../locations/location.entity';

@Entity('reservations')
export class Reservation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    customerName: string;

    @Column()
    customerPhone: string;

    @Column({ type: 'datetime' })
    reservationTime: Date;

    @Column({ default: 1 })
    guestCount: number;

    @ManyToOne(() => Table, { nullable: true, onDelete: 'SET NULL' })
    table: Table;

    @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
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
