import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from '../products/product.entity';

@Entity('stocks')
export class Stock {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    location: string;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    quantity: number;

    @ManyToOne(() => Product, product => product.stocks, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    product: Product;

    @Column({ nullable: true })
    lotNumber: string;

    @Column({ type: 'date', nullable: true })
    expirationDate: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
