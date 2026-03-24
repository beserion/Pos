import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Location } from '../locations/location.entity';
import type { OutputProfile } from '../output-profiles/output-profile.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Location, { nullable: true })
  location: Location;

  @Column({ nullable: true , default: 0 })
  locationId: number;

  // Stok Grubu bazında çıktı profili override
  @Column({ nullable: true, default: 0 })
  outputProfileId: number;

  @ManyToOne('OutputProfile', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'outputProfileId' })
  outputProfile: OutputProfile;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
