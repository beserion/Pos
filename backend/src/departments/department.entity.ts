import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Location } from '../locations/location.entity';
import type { OutputProfile } from '../output-profiles/output-profile.entity';
import { ParentGroup } from '../parent-groups/parent-group.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Location, { nullable: true })
  location: Location;

  @Column({ nullable: true })
  locationId: number;

  // Stok Grubu bazında çıktı profili override
  @Column({ nullable: true })
  outputProfileId: number;

  @ManyToOne('OutputProfile', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'outputProfileId' })
  outputProfile: OutputProfile;

  // Ekstra ürün grubu (Pop-Up içinde çıkacak)
  @Column({ nullable: true })
  extraDepartmentId: number;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'extraDepartmentId' })
  extraDepartment: Department;

  // Ana ürün seçilince ekstrayı otomatik aç
  @Column({ default: false })
  autoOpenExtraPopup: boolean;

  @Column({ nullable: true })
  parentGroupId: number;

  @ManyToOne(() => ParentGroup, (parentGroup) => parentGroup.departments, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentGroupId' })
  parentGroup: ParentGroup;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
