import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from './employee.entity';

@Entity('employee_documents')
export class EmployeeDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employeeId: number;

  @ManyToOne(() => Employee, (employee) => employee.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @Column()
  documentType: string; // e.g., 'Ehliyet', 'Sözleşme', 'Sabıka Kaydı'

  @Column({ type: 'text' })
  documentData: string; // Base64 content or document URL

  @CreateDateColumn()
  createdAt: Date;
}
