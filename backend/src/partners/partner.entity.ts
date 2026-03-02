import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('partners')
export class Partner {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string; // Ad/Soyad veya Firma Adı

    @Column({
        type: 'varchar',
        length: 20,
        default: 'CUSTOMER'
    })
    type: string; // 'CUSTOMER' veya 'SUPPLIER'

    @Column({ nullable: true })
    contactName: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    taxNumber: string;

    @Column({ nullable: true })
    taxOffice: string;

    @Column({ nullable: true })
    city: string;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    creditLimit: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    currentBalance: number;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
