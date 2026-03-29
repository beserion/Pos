import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Warehouse } from '../warehouses/warehouse.entity';
import type { Partner } from '../partners/partner.entity';
import type { OutputProfile } from '../output-profiles/output-profile.entity';

@Entity('stock_cards')
export class StockCard {
  @PrimaryGeneratedColumn()
  id: number;

  // ─── Kimlik (§8) ─────────────────────────────────────
  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  barcode: string;

  @Column({ nullable: true })
  sku: string; // Referans kodu

  @Column({ default: true })
  isActive: boolean;

  // ─── Stok Doğası / Sınıfı (§3) ───────────────────────
  // raw_material | traded_good | semi_finished | consumable | packaging
  @Column({ default: 'traded_good' })
  stockNature: string;

  // ─── Sınıflama (§8) ──────────────────────────────────
  @Column({ nullable: true })
  stockGroup: string; // Eski: category

  @Column({ nullable: true })
  stockSubgroup: string;

  @Column({ nullable: true })
  brand: string;

  // ─── Birimler (§8) ───────────────────────────────────
  @Column({ default: 'adet' })
  baseUnit: string;

  @Column({ nullable: true })
  purchaseUnit: string;

  @Column({ nullable: true })
  transferUnit: string;

  @Column('decimal', { precision: 10, scale: 4, default: 1 })
  conversionRate: number; // conversionFactor: purchaseUnit → baseUnit

  // ─── Tedarik / Alış / Maliyet (§8) ───────────────────
  @Column({ nullable: true })
  primaryVendorId: number;

  @ManyToOne('Partner', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'primaryVendorId' })
  primaryVendor: Partner;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  purchaseVat: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  lastPurchasePrice: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  averageCost: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  costPerBaseUnit: number;

  @Column({ default: 'TRY' })
  currency: string;

  // ─── Envanter (§8) ───────────────────────────────────
  @Column({ default: true })
  stockTrackingEnabled: boolean;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  currentStock: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  criticalStock: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  minStock: number; // Eski: minStockLevel

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  maxStock: number;

  @Column({ nullable: true })
  warehouseId: number;

  @ManyToOne('Warehouse', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @Column({ nullable: true })
  shelf: string; // Raf bilgisi

  // ─── Yazıcı Yönlendirme (§6 seviye 4) ───────────────
  @Column({ nullable: true })
  outputProfileId: number;

  @ManyToOne('OutputProfile', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'outputProfileId' })
  outputProfile: OutputProfile;

  // ─── Opsiyonel İleri Alanlar (§8) ────────────────────
  @Column({ default: false })
  lotTracking: boolean;

  @Column({ default: false })
  batchTracking: boolean;

  @Column({ default: false })
  expiryTracking: boolean;

  @Column({ default: false })
  serialTracking: boolean;

  // ─── Notlar ──────────────────────────────────────────
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Geriye uyumluluk alias (eski koddaki category referansları için)
  get category(): string {
    return this.stockGroup;
  }
  set category(val: string) {
    this.stockGroup = val;
  }

  get minStockLevel(): number {
    return this.minStock;
  }
  set minStockLevel(val: number) {
    this.minStock = val;
  }
}
