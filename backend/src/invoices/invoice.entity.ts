import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('invoices')
export class Invoice {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    invoiceNumber: string;

    @Column()
    saleId: number; // Refers to the Sale/Transaction

    @Column({ nullable: true })
    customerId: number;

    @Column({ nullable: true })
    description: string;

    @Column('decimal', { precision: 12, scale: 2 })
    totalAmount: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    taxAmount: number;

    @Column({ type: 'date' })
    issueDate: Date;

    @Column({ default: 'ISSUED' })
    status: string; // ISSUED, PAID, CANCELLED

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
