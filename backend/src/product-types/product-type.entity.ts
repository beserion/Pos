import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OutputProfile } from '../output-profiles/output-profile.entity';

@Entity('product_types')
export class ProductType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  // Bu cinse bağlı varsayılan çıktı profili
  @Column({ nullable: true, default: 0 })
  outputProfileId: number;

  @ManyToOne(() => OutputProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'outputProfileId' })
  outputProfile: OutputProfile;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
