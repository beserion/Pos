import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AuditActionType {
  ADISYON_CANCEL = 'ADISYON_CANCEL',       // Adisyon iptali
  ITEM_CANCEL = 'ITEM_CANCEL',             // Ürün iptali
  ITEM_REFUND = 'ITEM_REFUND',             // Ürün iadesi
  SALE_REFUND = 'SALE_REFUND',             // Tam satış iadesi
  DISCOUNT = 'DISCOUNT',                   // İskonto
  COMPLIMENTARY = 'COMPLIMENTARY',         // İkram
  PRICE_CHANGE = 'PRICE_CHANGE',           // Fiyat değişikliği
  QTY_CHANGE = 'QTY_CHANGE',              // Miktar değişikliği
  OPEN_ACCOUNT = 'OPEN_ACCOUNT',           // Açık hesaba çevirme
  ACCOUNT_PAYMENT = 'ACCOUNT_PAYMENT',     // Açık hesaptan tahsilat
  SHIFT_OPEN = 'SHIFT_OPEN',             // Vardiya açma
  SHIFT_CLOSE = 'SHIFT_CLOSE',           // Vardiya kapama
  END_OF_DAY = 'END_OF_DAY',             // Gün sonu alma
  END_OF_DAY_CANCEL = 'END_OF_DAY_CANCEL', // Gün sonu iptali
  USER_LOGIN = 'USER_LOGIN',             // Kullanıcı girişi
  USER_LOGOUT = 'USER_LOGOUT',           // Kullanıcı çıkışı
  FAILED_LOGIN = 'FAILED_LOGIN',         // Hatalı giriş
  OVERRIDE = 'OVERRIDE',                 // Yetkili override
}

@Entity('audit_logs')
@Index(['actionType'])
@Index(['userId'])
@Index(['createdAt'])
@Index(['saleId'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'datetime2', default: () => 'GETDATE()' })
  timestamp: Date;

  @Column('int', { default: 1 })
  companyId: number;

  // ─── Program Tarihi (İş Günü) ─────────────────────────────────────
  // İşlemin gerçekleştiği program tarihi (YYYY-MM-DD).
  @Column({ length: 10, nullable: true })
  businessDate: string;

  @Column('int', { nullable: true , default: 0 })
  cashRegisterId: number;

  @Column('int', { nullable: true , default: 0 })
  shiftId: number;

  @Column('int', { nullable: true , default: 0 })
  userId: number;

  @Column({ length: 100, nullable: true })
  userRole: string;

  @Column({ length: 50 })
  actionType: string; // AuditActionType

  @Column('int', { nullable: true , default: 0 })
  saleId: number;      // Belge / adisyon no

  @Column({ length: 100, nullable: true })
  serviceArea: string; // Servis alanı

  @Column({ length: 100, nullable: true })
  tableNo: string;     // Masa no

  @Column({ length: 200, nullable: true })
  productName: string; // Ürün

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  oldValue: string;    // Eski değer

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  newValue: string;    // Yeni değer

  @Column('decimal', { precision: 12, scale: 2, nullable: true , default: 0 })
  amount: number;      // Tutar

  @Column({ length: 500, nullable: true })
  description: string; // Açıklama

  @Column('int', { nullable: true , default: 0 })
  approvedByUserId: number; // Onaylayan kullanıcı

  @Column({ length: 200, nullable: true })
  deviceInfo: string;  // Cihaz / terminal bilgisi

  @CreateDateColumn()
  createdAt: Date;
}
