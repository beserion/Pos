import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OutputProfile } from '../output-profiles/output-profile.entity';

/**
 * Ürün Cinsi / Sales Cins (§4, §5)
 * Satış / operasyon / yazıcı / rapor tarafındaki sınıflama.
 * Aktif satışa açılan her ürün kartında cins seçimi ZORUNLUDUR.
 */
@Entity('product_types')
export class ProductType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  code: string; // alkol_icecek, alkolsuz_icecek, yiyecek, diger vb.

  // Bu cinse bağlı varsayılan çıktı profili (§6 seviye 3)
  @Column({ nullable: true })
  outputProfileId: number;

  @ManyToOne(() => OutputProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'outputProfileId' })
  outputProfile: OutputProfile;

  /**
   * §5: "Diğer" cinsi davranışı
   * true ise bu cinse ait ürünler varsayılan olarak
   * mutfak / bar yazıcısına GÖNDERİLMEZ.
   * Sadece hesap/kasa tarafında görünür.
   * İstenirse özel yazıcıya yönlendirilebilir.
   */
  @Column({ default: false })
  skipPrinterOutput: boolean;

  @Column({ nullable: true })
  color: string; // Rapor/UI renk kodu

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
