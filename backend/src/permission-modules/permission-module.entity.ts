import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('permission_modules')
export class PermModule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  key: string;

  @Column({ length: 200 })
  label: string;

  @Column({ length: 100, default: 'fa-cube' })
  icon: string;

  @Column({ length: 100, default: 'text-blue-500' })
  color: string;

  @Column({ name: 'accent_bg', length: 100, default: 'bg-blue-500/10' })
  accentBg: string;

  // Comma-separated action keys: VIEW,ADD,EDIT,DELETE,PRINT,APPROVE
  @Column({ length: 500, default: 'VIEW' })
  actions: string;

  @Column({ name: 'sort_order', default: 99 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
