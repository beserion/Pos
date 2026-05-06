import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('transfer_logs')
export class TransferLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'datetime2', default: () => 'GETDATE()' })
  timestamp: Date;

  // İşlem tipi: ITEM_TRANSFER, SUBCHECK_TRANSFER, TABLE_TRANSFER
  @Column({ length: 30 })
  transferType: string;

  // Kaynak bilgileri
  @Column('int', { nullable: true })
  sourceTableId: number;

  @Column({ length: 100, nullable: true })
  sourceTableName: string;

  @Column('int', { nullable: true })
  sourceSubCheckId: number;

  @Column({ length: 100, nullable: true })
  sourceSubCheckLabel: string;

  // Hedef bilgileri
  @Column('int', { nullable: true })
  targetTableId: number;

  @Column({ length: 100, nullable: true })
  targetTableName: string;

  @Column('int', { nullable: true })
  targetSubCheckId: number;

  @Column({ length: 100, nullable: true })
  targetSubCheckLabel: string;

  // Taşınan içerik (JSON string — ürün id/ad/miktar listesi)
  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  transferredItems: string;

  // İşlemi yapan kullanıcı
  @Column('int')
  userId: number;

  // Tutar bilgileri
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  amountBefore: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  amountAfter: number;

  // Benzersiz transfer kodu (ör: TRF-M12-A2-001)
  @Column({ length: 50, nullable: true })
  transferCode: string;

  @Column('int', { default: 1 })
  companyId: number;
}
