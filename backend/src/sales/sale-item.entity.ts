import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Sale } from './sale.entity';

@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saleId' })
  sale: Sale;

  @Column()
  productId: number;

  @Column('decimal', { precision: 10, scale: 2 , default: 0 })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 , default: 0 })
  unitPrice: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  costPrice: number;

  @Column('decimal', { precision: 12, scale: 2 , default: 0 })
  total: number;

  @Column({ nullable: true })
  note: string;

  @Column({ default: false })
  isPaid: boolean;

  @Column({ default: false })
  isWaiting: boolean;

  @Column({ default: false })
  isMarshed: boolean;

  @Column({ default: false })
  isReady: boolean;

  // --- Durum / İptal / İade ---
  @Column({ length: 20, default: 'ACTIVE' })
  status: string; // ACTIVE, CANCELLED, REFUNDED

  @Column({ length: 500, nullable: true })
  cancelReason: string;

  @Column({ length: 500, nullable: true })
  refundReason: string;

  @Column({ nullable: true })
  cancelledByUserId: number;

  @Column({ nullable: true })
  refundedByUserId: number;

  // --- Yazdırma / KDS Gönderim Takibi ---
  @Column({ default: false })
  isSentToPrinter: boolean;

  // Hangi çıktı profiline göre gönderildi
  @Column({ nullable: true })
  sentOutputProfileId: number;

  // Ürün cinsi (raporlama için snapshot)
  @Column({ nullable: true })
  productTypeName: string;

  // --- Set Menü / Fix Menü Hazırlık Alanları (Gelecek Faz) ---
  @Column('int', { nullable: true })
  parentItemId: number;

  @Column({ nullable: true, length: 50 })
  menuGroupId: string;

  // --- Satış Tipi (Yarım / Duble) ---
  @Column({ length: 20, default: 'STANDARD' })
  saleType: string;

  @Column('decimal', { precision: 5, scale: 2, default: 1.00 })
  saleTypeMultiplier: number;

  // --- Varyant (Yeni) ---
  @Column({ nullable: true })
  variationId: number;

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  variationName: string;

  // --- İşlem Tipi (İkram, Ödenmez, vb.) ---
  @Column({ length: 20, default: 'SALE' })
  transactionType: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  transactionReason: string | null;

  // --- Kim Ekledi / Ne Zaman ---
  @Column({ nullable: true })
  addedByUserId: number;

  @CreateDateColumn({ nullable: true })
  addedAt: Date;
}
