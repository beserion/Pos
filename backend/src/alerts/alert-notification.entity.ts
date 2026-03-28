import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AlertRule } from './alert-rule.entity';

@Entity('alert_notifications')
export class AlertNotification {
  @PrimaryGeneratedColumn()
  id: number;

  /** Kaynak kural (kural silinse bile bildirim kayıt korunur) */
  @ManyToOne(() => AlertRule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ruleId' })
  rule: AlertRule;

  @Column({ nullable: true , default: 0 })
  ruleId: number;

  /** Olay anahtarı kopyalanır (kural bağımsız sorgu için) */
  @Column({ length: 100 })
  eventKey: string;

  /** CRITICAL | WARNING | INFO */
  @Column({ length: 20, default: 'INFO' })
  severity: string;

  /** POPUP | LIST | SILENT */
  @Column({ length: 20, default: 'LIST' })
  displayMode: string;

  /** Bildirimin hedef kullanıcısı */
  @Column({ nullable: true , default: 0 })
  targetUserId: number;

  /** Bildirimin hedef rolü */
  @Column({ nullable: true , default: 0 })
  targetRoleId: number;

  /** Olayı tetikleyen kullanıcı */
  @Column({ nullable: true , default: 0 })
  triggerUserId: number;

  @Column({ length: 150, nullable: true })
  triggerUserName: string;

  /** İlgili satış */
  @Column({ nullable: true , default: 0 })
  saleId: number;

  /** İlgili masa */
  @Column({ nullable: true , default: 0 })
  tableId: number;

  @Column({ length: 50, nullable: true })
  tableName: string;

  /** Genel ilgili kayıt ID */
  @Column({ nullable: true , default: 0 })
  relatedId: number;

  /** Bildirim açıklaması / mesajı */
  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  description: string;

  /** Okundu mu */
  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  readAt: Date;

  @Column({ nullable: true , default: 0 })
  readByUserId: number;

  @CreateDateColumn()
  createdAt: Date;
}
