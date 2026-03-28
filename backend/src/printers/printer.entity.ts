import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Product } from '../products/product.entity';

@Entity('printers')
export class Printer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  printerName: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Product, (product) => product.printer)
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
