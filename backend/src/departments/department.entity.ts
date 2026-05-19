import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Location } from '../locations/location.entity';
import type { OutputProfile } from '../output-profiles/output-profile.entity';
import type { Zone } from '../zones/zone.entity';
import { ParentGroup } from '../parent-groups/parent-group.entity';
import { ManyToMany, JoinTable } from 'typeorm';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  imageUrl: string;

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

  @Column({ default: 0 })
  orderIndex: number;

  @ManyToMany('Zone', { cascade: true })
  @JoinTable({
    name: 'department_visible_zones',
    joinColumn: { name: 'departmentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'zoneId', referencedColumnName: 'id' }
  })
  visibleZones: Zone[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
