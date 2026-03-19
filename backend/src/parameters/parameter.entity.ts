import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_parameters')
export class Parameter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  module: string; // 'pos', 'kitchen', 'printer', etc.

  @Column({ length: 100 })
  key: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  value: string;

  @Column({ length: 50, default: 'text' })
  type: string; // 'text', 'number', 'boolean', 'select'

  @Column({ length: 200, nullable: true })
  label: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
