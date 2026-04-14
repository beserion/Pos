import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { StockCard } from '../stock-cards/stock-card.entity';
import type { Warehouse } from '../warehouses/warehouse.entity';

/**
 * Stok hareket tipleri (§15):
 * OPENING_BALANCE, PURCHASE, GOODS_RECEIPT, COUNT_ADJUSTMENT,
 * RECIPE_CONSUMPTION, DIRECT_SALE_CONSUMPTION, WASTE, SPOILAGE,
 * TRANSFER_OUT, TRANSFER_IN, RETURN_IN, RETURN_OUT, MANUAL_ADJUSTMENT,
 * RECIPE_CONSUME, RECIPE_REVERSE, MANUAL_IN, MANUAL_OUT,
 * STAFF_CONSUME, COMPLIMENTARY, PRODUCTION, PRODUCTION_CONSUME,
 * COUNT_SURPLUS, COUNT_DEFICIT, WASTAGE
 */

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  stockCardId: number;

  @ManyToOne('StockCard', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stockCardId' })
  stockCard: StockCard;

  @Column({ type: 'date', nullable: true })
  businessDate: Date;

  @Column()
  movementType: string;
<<<<<<< HEAD
=======
  // opening_balance, purchase, goods_receipt, count_adjustment, 
  // recipe_consumption, direct_sale_consumption, waste, spoilage, 
  // transfer_out, transfer_in, return_in, return_out, manual_adjustment

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  qtyIn: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  qtyOut: number;
>>>>>>> upstream/server

  // ─── Miktar Alanları (§15) ───────────────────────────
  @Column('decimal', { precision: 12, scale: 4 })
<<<<<<< HEAD
  quantity: number; // Mevcut: +/- toplam miktar

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  qtyIn: number; // Giriş miktarı (pozitif)

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  qtyOut: number; // Çıkış miktarı (pozitif)

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  qtyBefore: number; // Hareket öncesi bakiye

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  stockAfter: number; // qtyAfter: hareket sonrası bakiye
=======
  quantity: number; // Net miktar (in - out)
>>>>>>> upstream/server

  @Column({ default: 'adet' })
  unit: string;

  // ─── Maliyet (§15) ──────────────────────────────────
  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  unitCost: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  totalCost: number;

<<<<<<< HEAD
  // ─── Tarih (§15) ────────────────────────────────────
  @Column({ type: 'date', nullable: true })
  businessDate: Date; // İş günü tarihi
=======
  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  qtyBefore: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  stockAfter: number; // qty_after
>>>>>>> upstream/server

  // ─── Depo ───────────────────────────────────────────
  @Column({ nullable: true })
  warehouseId: number;

  @ManyToOne('Warehouse', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  // ─── Belge Bilgileri (§15) ──────────────────────────
  @Column({ nullable: true })
  documentType: string; // INVOICE, COUNT_SESSION, TRANSFER, SALE, MANUAL

  @Column({ nullable: true })
  documentNo: string; // Belge numarası

  // ─── Kaynak İzleme (§15, §16 cross-reference) ──────
  @Column({ nullable: true })
  sourceType: string; // Eski: referenceType → SALE, INVOICE, COUNT, MANUAL, PRODUCT_TRANSACTION

  @Column({ nullable: true })
  sourceId: number; // Eski: referenceId

  // Geriye uyumluluk alias'lar
  @Column({ nullable: true })
  documentType: string;

  @Column({ nullable: true })
  documentNo: string;

<<<<<<< HEAD
  // ─── Kullanıcı (§15) ───────────────────────────────
=======
  @Column({ nullable: true })
  sourceType: string;

  @Column({ nullable: true })
  sourceId: number;

>>>>>>> upstream/server
  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
<<<<<<< HEAD
  approveUserId: number; // Onaylayan kullanıcı

  // ─── Sebep / Not (§15) ─────────────────────────────
=======
  approveUserId: number;

>>>>>>> upstream/server
  @Column({ nullable: true })
  reasonCode: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
<<<<<<< HEAD
  note: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  description: string; // Eski alan, note ile aynı amaca hizmet
=======
  description: string; // note
>>>>>>> upstream/server

  @CreateDateColumn()
  createdAt: Date;
}
