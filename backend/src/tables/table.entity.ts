import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Zone } from '../zones/zone.entity';

@Entity('tables')
export class Table {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string; // e.g., "Masa 1", "Balkon 3"

    @Column({ default: 4 })
    capacity: number;

    @Column({ default: 'BOŞ' }) // BOŞ, DOLU, REZERVE
    status: string;

    @ManyToOne(() => Zone, zone => zone.tables, { onDelete: 'CASCADE' })
    zone: Zone;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    waiterName: string;

    @Column({ type: 'datetime', nullable: true })
    orderStartTime: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
