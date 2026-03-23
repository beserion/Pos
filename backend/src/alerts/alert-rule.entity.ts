import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('alert_rules')
export class AlertRule {
  @PrimaryGeneratedColumn()
  id: number;

  /** Olay anahtarı — örn: SALE_CANCELLED, SALE_DISCOUNT_HIGH, PIN_FAIL_LIMIT */
  @Column({ length: 100 })
  eventKey: string;

  /** Kural aktif mi */
  @Column({ default: true })
  isActive: boolean;

  /** CRITICAL | WARNING | INFO */
  @Column({ length: 20, default: 'INFO' })
  severity: string;

  /** POPUP | LIST | SILENT */
  @Column({ length: 20, default: 'LIST' })
  displayMode: string;

  /** Eşik değeri (isteğe bağlı) — örn: indirim %15, PIN 5 deneme */
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  thresholdValue: number;

  /** USER | ROLE | ALL */
  @Column({ length: 20, default: 'ALL' })
  targetType: string;

  /** targetType = USER ise userId, ROLE ise roleId, ALL ise null */
  @Column({ nullable: true })
  targetId: number;

  /** Kural açıklaması */
  @Column({ length: 500, nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
