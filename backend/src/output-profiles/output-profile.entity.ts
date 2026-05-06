import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Printer } from '../printers/printer.entity';

@Entity('output_profiles')
export class OutputProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  // Ana üretim yazıcısı
  @Column({ nullable: true })
  mainPrinterId: number;

  @ManyToOne(() => Printer, { nullable: true })
  @JoinColumn({ name: 'mainPrinterId' })
  mainPrinter: Printer;

  // KDS hedefi
  @Column({ default: false })
  kdsEnabled: boolean;

  @Column({ nullable: true })
  kdsTarget: string;

  // Bilgi yazıcısı
  @Column({ nullable: true })
  infoPrinterId: number;

  @ManyToOne(() => Printer, { nullable: true })
  @JoinColumn({ name: 'infoPrinterId' })
  infoPrinter: Printer;

  // Kopya sayısı
  @Column({ default: 1 })
  copyCount: number;

  // Yazıcı yoksa uyarı verilsin mi?
  @Column({ default: true })
  warnIfNoPrinter: boolean;

  // Sadece bilgi fişi mi?
  @Column({ default: false })
  infoOnly: boolean;

  // Tamamen çıktı dışı mı?
  @Column({ default: false })
  noOutput: boolean;

  @Column({ default: true })
  isActive: boolean;

  // --- Yeni Şablon ve Fiş Düzeni Ayarları ---

  @Column({ default: false })
  soundAlert: boolean;

  @Column({ default: 'NORMAL' })
  textSize: string; // 'NORMAL', 'LARGE', 'XLARGE'

  @Column({ default: 'A' })
  fontFamily: string; // 'A' veya 'B'

  @Column({ default: false })
  showPrice: boolean;

  @Column({ default: true })
  showTable: boolean;

  @Column({ default: true })
  showWaiter: boolean;

  @Column({ default: true })
  showPortion: boolean;

  @Column({ default: true })
  showTitle: boolean;

  @Column({ default: 'STANDARD' })
  profileType: string; // 'STANDARD', 'Z_REPORT'

  @Column({ default: false })
  showLogo: boolean;

  @Column({ default: true })
  showExchangeRates: boolean;

  @Column({ default: true })
  showWaiterSales: boolean;

  @Column({ default: true })
  groupByCategory: boolean;

  @Column({ nullable: true })
  customTitle: string;

  @Column({ default: true })
  showProductSummary: boolean;

  @Column({ default: true })
  showTransactionAnalysis: boolean;

  @Column({ type: 'text', nullable: true })
  logoPath: string;

  @Column({ default: true })
  showCurrencyDetails: boolean;

  @Column({ default: true })
  showVatSummary: boolean;

  @Column({ default: true })
  showDiscountDetails: boolean;

  @Column({ default: true })
  showGuestStats: boolean;

  @Column({ default: true })
  showDepartmentSales: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
