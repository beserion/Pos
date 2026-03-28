import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Location } from '../locations/location.entity';
import { User } from '../users/user.entity';
import { EmployeeDocument } from './employee-document.entity';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  roleTitle: string; // e.g., "Garson", "Şef", "Kasiyer"

  @Column({ nullable: true })
  phone: string;

  @ManyToOne(() => Location, (location) => location.employees, {
    onDelete: 'NO ACTION',
    nullable: true,
  })
  location: Location;

  // Link an employee to a system login account if needed
  @ManyToOne(() => User, { nullable: true, onDelete: 'NO ACTION' })
  userAccount: User;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  vehicleType: string; // e.g., "Motosiklet", "Bisiklet", "Araba"

  @Column({ nullable: true })
  licensePlate: string; // Plaka

  @Column({ default: 'OFF_DUTY' })
  courierStatus: string; // 'AVAILABLE', 'BUSY', 'OFF_DUTY'

  @Column({ type: 'text', nullable: true })
  photo: string; // Profil fotoğrafı (Base64 veya URL)

  @Column({ type: 'text', nullable: true })
  document: string; // Belge (Eski yapı - silinebilir ancak geriye dönük kalsın)

  @OneToMany(() => EmployeeDocument, (doc) => doc.employee)
  documents: EmployeeDocument[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
