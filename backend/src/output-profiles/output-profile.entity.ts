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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
