import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { Stock } from '../stocks/stock.entity';
import { Printer } from '../printers/printer.entity';

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ unique: true })
    sku: string; // Stock Keeping Unit / Barkod

    @Column('decimal', { precision: 10, scale: 2 })
    price: number;

    @Column({ nullable: true })
    category: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    printerId: number;

    @ManyToOne(() => Printer, printer => printer.products, { nullable: true, onDelete: 'SET NULL' })
    printer: Printer;

    @OneToMany(() => Stock, stock => stock.product)
    stocks: Stock[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
