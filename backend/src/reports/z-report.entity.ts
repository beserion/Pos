import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('z_reports')
export class ZReport {
  @PrimaryGeneratedColumn()
  id: number;

  // --- 1. Üst Bilgiler ---
  @Column({ default: 0 })
  cashRegisterId: number;

  @Column({ length: 10 })
  businessDate: string; // 'YYYY-MM-DD'

  @Column({ nullable: true , default: 0 })
  zNumber: number; // Z numarası

  @Column({ type: 'datetime2', nullable: true })
  openedAt: Date; // Açılış tarihi-saat

  @Column({ type: 'datetime2', nullable: true })
  closedAt: Date; // Kapanış tarihi-saat

  @Column({ default: 0 })
  generatedByUserId: number;

  @Column('int', { default: 1 })
  companyId: number;

  // --- 2. Satış Özeti ---
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  netSales: number; // Net Satış / Ciro (brüt gösterilmez)

  // --- 3. Tahsilat Toplamları ---
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  cashCollection: number; // Nakit

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  creditCardCollection: number; // Kredi kartı

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  cariCollection: number; // Cari

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  mealCardCollection: number; // Yemek kartı

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  onlinePaymentCollection: number; // Online ödeme

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  giftCardCollection: number; // Hediye kartı

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  otherCollection: number; // Diğer ödeme yöntemleri

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalCollection: number; // Toplam tahsilat

  // --- 4. Operasyon Özeti ---
  @Column('int', { default: 0 })
  totalReceipts: number; // Toplam fiş / adisyon sayısı

  @Column('int', { default: 0 })
  totalCustomers: number; // Toplam müşteri / cover

  @Column('int', { default: 0 })
  totalProductCount: number; // Toplam ürün adedi

  // --- 5. Düzeltme / Kontrol Alanları ---
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  discountTotal: number; // İskonto

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  complimentaryTotal: number; // İkram

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  refundTotal: number; // İade

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  cancelTotal: number; // İptal

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  serviceFeeTotal: number; // Servis bedeli

  // --- 6. Vergi Özeti ---
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  taxBase: number; // KDV matrahı

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  taxTotal: number; // KDV toplamı

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  taxBreakdown: string; // JSON — vergi oran bazlı kırılım

  // --- 7. Açık Hesap Özeti ---
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  openAccountPrevious: number; // Önceki günden devreden

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  openAccountNew: number; // Bugün açılan

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  openAccountClosed: number; // Bugün kapanan

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  openAccountRemaining: number; // Güne kalan

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  categoryTotals: string; // JSON - Kategori bazlı satışlar

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  waiterSales: string; // JSON - Garson bazlı satışlar

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  paymentTotals: string; // JSON - Ödeme yöntemli toplamlar

  // --- 8. Kapanış Özeti ---
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  expectedTotal: number; // Beklenen toplam

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  confirmedTotal: number; // Kesinleşen toplam

  // Legacy fields (backward compat)
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalOpeningCash: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalClosingCash: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalExpectedCash: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalCashDifference: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalIncome: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalExpense: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
