import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('inpos_config')
export class InposConfig {
  @PrimaryGeneratedColumn()
  id: number;

  /** 12 haneli cihaz sicil numarası */
  @Column({ length: 12 })
  serialNo: string;

  /** Dinleme IP adresi (varsayılan: 0.0.0.0) */
  @Column({ length: 45, default: '0.0.0.0' })
  listenIp: string;

  /** TCP port (varsayılan: 8000) */
  @Column({ default: 8000 })
  port: number;

  /** Entegrasyon aktif mi */
  @Column({ default: true })
  isActive: boolean;

  /** Uygulama başladığında otomatik bağlan */
  @Column({ default: false })
  autoConnect: boolean;

  /** Kısım-KDV eşleştirmeleri (JSON formatında) */
  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  sectionMappings: string;

  /** Hangi şirkete ait */
  @Column({ nullable: true, default: 1 })
  companyId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
