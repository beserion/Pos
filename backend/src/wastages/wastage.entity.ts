import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';

@Entity('wastages')
export class Wastage {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Product, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    product: Product;

    @Column()
    productId: number;

    @Column('decimal', { precision: 10, scale: 3 })
    quantity: number;

    @Column({ default: 'adet' })
    unit: string;

    @Column()
    reason: string; // bozulma, düşürme, son kullanma tarihi, diğer

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'recordedById' })
    recordedBy: User;

    @Column({ nullable: true })
    recordedById: number;

    @Column({ nullable: true })
    note: string;

    @CreateDateColumn()
    createdAt: Date;
}
