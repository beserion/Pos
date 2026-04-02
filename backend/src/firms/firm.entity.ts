import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('firms')
export class Firm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @Column('simple-array', { nullable: true })
  activeFeatures: string[]; // e.g., 'recipe_system', 'waiter_app', 'qr_menu', 'kds'

  @OneToMany(() => User, (user) => user.firm)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
