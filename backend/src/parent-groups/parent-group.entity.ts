import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Department } from '../departments/department.entity';

@Entity('parent_groups')
export class ParentGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  imageUrl: string;

  @Column({ default: 0 })
  orderIndex: number;

  @OneToMany(() => Department, (department) => department.parentGroup)
  departments: Department[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
