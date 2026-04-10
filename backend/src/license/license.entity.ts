import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('SystemLicense')
export class SystemLicense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 1000 })
  licenseKey: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  deviceId: string;

  @Column({ type: 'bit', default: false })
  isActivated: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastOnlineCheck: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
