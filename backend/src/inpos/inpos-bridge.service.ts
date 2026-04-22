import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as path from 'path';
import {
  InposExtError, InposEcrState, InposEcrSaleState, InposPaymentType,
  InposSaleItemData, InposSaleTotals, InposSaleReceiptData, InposSectionInfo,
  InposConnectionConfig, InposConnectionStatus, InposInvoiceInfo,
} from './inpos.types';

// koffi FFI kütüphanesi (opsiyonel — yoksa mock modda çalışır)
let koffi: any = null;
try {
  koffi = require('koffi');
} catch {
  // koffi kurulu değilse servis mock modda çalışır
}

@Injectable()
export class InposBridgeService implements OnModuleDestroy {
  private readonly logger = new Logger(InposBridgeService.name);
  private lib: any = null;
  private fn: Record<string, any> = {};
  private connected = false;
  private activeSerialNo = '';
  private readonly DEFAULT_TIMEOUT = 5000;

  constructor() {
    this.loadLibrary();
  }

  onModuleDestroy() {
    this.closeAll();
  }

  /** DLL'i yükle */
  private loadLibrary(): void {
    if (!koffi) {
      this.logger.warn('koffi bulunamadı. inPOS bridge mock modda çalışacak.');
      return;
    }

    const dllPath = path.resolve(__dirname, '..', '..', 'lib', 'inpos', 'inposext.dll');
    try {
      this.lib = koffi.load(dllPath);

      // Fonksiyonları tanımla (stdcall convention)
      this.fn = {
        version:            this.lib.stdcall('inposext_version', 'str', []),
        initialize:         this.lib.stdcall('inposext_initialize', 'int', ['uint32', 'str', 'str', 'uint16', 'uint32']),
        close:              this.lib.stdcall('inposext_close', 'void', []),
        closeAll:           this.lib.stdcall('inposext_close_all', 'void', []),
        login:              this.lib.stdcall('inposext_login', 'int', ['uint32']),
        logout:             this.lib.stdcall('inposext_logout', 'int', ['uint32']),
        setCashierName:     this.lib.stdcall('inposext_set_cashier_name', 'int', ['uint32', 'str']),
        ecrState:           this.lib.stdcall('inposext_ecr_state', 'int', ['uint32', koffi.out(koffi.pointer('int'))]),
        ecrSaleState:       this.lib.stdcall('inposext_ecr_sale_state', 'int', ['uint32', koffi.out(koffi.pointer('int')), koffi.out(koffi.pointer('int'))]),
        startSale:          this.lib.stdcall('inposext_start_sale', 'int', ['uint32']),
        startSaleInvoice:   this.lib.stdcall('inposext_start_sale_with_invoice', 'int', ['uint32']),
        addSaleItem:        this.lib.stdcall('inposext_add_sale_item', 'int', ['uint32', 'void *', 'void *']),
        addPayment:         this.lib.stdcall('inposext_add_payment', 'int', ['int', 'uint64']),
        endSale:            this.lib.stdcall('inposext_end_sale', 'int', ['int']),
        endSaleInvoice:     this.lib.stdcall('inposext_end_sale_with_invoice', 'int', ['void *']),
        cancelSale:         this.lib.stdcall('inposext_cancel_sale', 'int', ['uint32']),
        saleState:          this.lib.stdcall('inposext_sale_state', 'int', ['uint32', 'void *', 'void *', 'void *']),
        xReport:            this.lib.stdcall('inposext_x_report', 'int', []),
        zReport:            this.lib.stdcall('inposext_z_report', 'int', []),
        currentZ:           this.lib.stdcall('inposext_current_z', 'int', ['uint32', koffi.out(koffi.pointer('uint32'))]),
        lastZDatetime:      this.lib.stdcall('inposext_last_z_datetime', 'int', ['uint32', koffi.out(koffi.pointer('int32'))]),
        ecrDatetime:        this.lib.stdcall('inposext_ecr_datetime', 'int', ['uint32', koffi.out(koffi.pointer('int32'))]),
        saleLimit:          this.lib.stdcall('inposext_sale_limit', 'int', ['uint32', koffi.out(koffi.pointer('uint64'))]),
        blockKeys:          this.lib.stdcall('inposext_block_ecr_keys', 'int', []),
        unblockKeys:        this.lib.stdcall('inposext_unblock_ecr_keys', 'int', []),
        keyBlockStatus:     this.lib.stdcall('inposext_ecr_key_blocking_status', 'int', ['uint32', koffi.out(koffi.pointer('int32'))]),
        checkPaper:         this.lib.stdcall('inposext_check_printer_paper', 'int', ['uint32']),
        errorDetail:        this.lib.stdcall('inposext_error_detail', 'int', []),
      };

      const ver = this.fn.version();
      this.logger.log(`inPOS DLL yüklendi (koffi). Sürüm: ${ver}`);
    } catch (err: any) {
      this.logger.error(`inPOS DLL yüklenemedi: ${err.message}`);
      this.lib = null;
      this.fn = {};
    }
  }

  isLibraryLoaded(): boolean { return this.lib !== null; }
  isConnected(): boolean { return this.connected; }

  // ─── Bağlantı ──────────────────────────────────────────────

  async initialize(config: InposConnectionConfig): Promise<InposExtError> {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    const appNo = config.applicationNo || 1;
    const timeout = config.timeout || 700;
    const err: number = this.fn.initialize(appNo, config.serialNo.toUpperCase(), config.listenIp, config.port, timeout);
    if (err === InposExtError.InposNoError) {
      this.connected = true;
      this.activeSerialNo = config.serialNo;
      this.logger.log(`Yazarkasa bağlantısı kuruldu: ${config.serialNo}`);
    }
    return err as InposExtError;
  }

  close(): void {
    if (!this.lib) return;
    this.fn.close();
    this.connected = false;
    this.logger.log('Yazarkasa bağlantısı kapatıldı.');
  }

  closeAll(): void {
    if (!this.lib) return;
    this.fn.closeAll();
    this.connected = false;
  }

  // ─── Durum Sorgu ───────────────────────────────────────────

  getEcrState(timeout?: number): { error: InposExtError; ecrState: InposEcrState } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, ecrState: InposEcrState.InposEcrInitialization };
    const stateArr = [0];
    const err = this.fn.ecrState(timeout || this.DEFAULT_TIMEOUT, stateArr);
    return { error: err, ecrState: stateArr[0] as InposEcrState };
  }

  getEcrSaleState(timeout?: number): { error: InposExtError; ecrState: InposEcrState; saleState: InposEcrSaleState } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, ecrState: InposEcrState.InposEcrInitialization, saleState: InposEcrSaleState.InposSaleIdle };
    const ecrArr = [0];
    const saleArr = [0];
    const err = this.fn.ecrSaleState(timeout || this.DEFAULT_TIMEOUT, ecrArr, saleArr);
    return { error: err, ecrState: ecrArr[0] as InposEcrState, saleState: saleArr[0] as InposEcrSaleState };
  }

  // ─── Kasiyer ───────────────────────────────────────────────

  login(timeout?: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.fn.login(timeout || this.DEFAULT_TIMEOUT);
  }

  logout(timeout?: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.fn.logout(timeout || this.DEFAULT_TIMEOUT);
  }

  setCashierName(name: string, timeout?: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.fn.setCashierName(timeout || this.DEFAULT_TIMEOUT, name);
  }

  // ─── Satış ─────────────────────────────────────────────────

  startSale(timeout?: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.fn.startSale(timeout || this.DEFAULT_TIMEOUT);
  }

  startSaleWithInvoice(timeout?: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.fn.startSaleInvoice(timeout || this.DEFAULT_TIMEOUT);
  }

  addSaleItem(item: InposSaleItemData, timeout?: number): { error: InposExtError; totals: InposSaleTotals } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, totals: this.emptyTotals() };

    // InposEcrSaleItem C struct'ı — Buffer olarak hazırla
    // Layout: unitPrice(8) + multiplier(4) + discountRate(4) + discountAmount(8) + name(97) + section(1) + padding(2) + unit(4)
    const itemBuf = Buffer.alloc(256);
    itemBuf.writeBigUInt64LE(BigInt(item.unitPrice), 0);
    itemBuf.writeUInt32LE(item.multiplier, 8);
    itemBuf.writeInt32LE(item.discountRate, 12);
    itemBuf.writeBigUInt64LE(BigInt(item.discountAmount), 16);
    const nameBuf = Buffer.from(item.name, 'utf-8');
    nameBuf.copy(itemBuf, 24, 0, Math.min(nameBuf.length, 96));
    itemBuf[24 + Math.min(nameBuf.length, 96)] = 0;
    itemBuf.writeUInt8(item.section, 121);
    itemBuf.writeInt32LE(item.unit, 124);

    const totalsBuf = Buffer.alloc(48);
    const err = this.fn.addSaleItem(timeout || this.DEFAULT_TIMEOUT, itemBuf, totalsBuf);
    return { error: err, totals: this.parseTotals(totalsBuf) };
  }

  addPayment(paymentType: InposPaymentType, amount: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.fn.addPayment(paymentType, amount);
  }

  endSale(paymentType: InposPaymentType): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.fn.endSale(paymentType);
  }

  endSaleWithInvoice(invoiceData: InposInvoiceInfo): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    const buf = Buffer.alloc(128);
    buf.writeInt32LE(invoiceData.invoiceType, 0);
    buf.writeInt32LE(invoiceData.noType, 4);
    const custNo = Buffer.from(invoiceData.customerNo, 'utf-8');
    custNo.copy(buf, 8, 0, Math.min(custNo.length, 11));
    buf[8 + Math.min(custNo.length, 11)] = 0;
    const invNo = Buffer.from(invoiceData.invoiceNo, 'utf-8');
    invNo.copy(buf, 20, 0, Math.min(invNo.length, 16));
    buf[20 + Math.min(invNo.length, 16)] = 0;
    buf.writeUInt32LE(invoiceData.slipCount, 40);
    buf.writeUInt32LE(invoiceData.printDeliveryNote ? 1 : 0, 44);
    return this.fn.endSaleInvoice(buf);
  }

  cancelSale(timeout?: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.fn.cancelSale(timeout || this.DEFAULT_TIMEOUT);
  }

  getSaleState(timeout?: number): { error: InposExtError; saleState: InposEcrSaleState; totals: InposSaleTotals; receipt: InposSaleReceiptData } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, saleState: InposEcrSaleState.InposSaleIdle, totals: this.emptyTotals(), receipt: { receiptNo: 0, zNo: 0 } };
    const saleBuf = Buffer.alloc(4);
    const totalsBuf = Buffer.alloc(48);
    const receiptBuf = Buffer.alloc(16);
    const err = this.fn.saleState(timeout || this.DEFAULT_TIMEOUT, saleBuf, totalsBuf, receiptBuf);
    return {
      error: err,
      saleState: saleBuf.readInt32LE(0),
      totals: this.parseTotals(totalsBuf),
      receipt: { receiptNo: receiptBuf.readUInt32LE(0), zNo: receiptBuf.readUInt32LE(4) },
    };
  }

  // ─── Raporlar ──────────────────────────────────────────────

  xReport(): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.fn.xReport();
  }

  zReport(): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.fn.zReport();
  }

  getCurrentZ(timeout?: number): { error: InposExtError; zNo: number } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, zNo: 0 };
    const arr = [0];
    const err = this.fn.currentZ(timeout || this.DEFAULT_TIMEOUT, arr);
    return { error: err, zNo: arr[0] };
  }

  // ─── Tarih/Saat ────────────────────────────────────────────

  getLastZDateTime(timeout?: number): { error: InposExtError; dateTime: Date | null } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, dateTime: null };
    const arr = [0];
    const err = this.fn.lastZDatetime(timeout || this.DEFAULT_TIMEOUT, arr);
    return { error: err, dateTime: arr[0] > 0 ? new Date(arr[0] * 1000) : null };
  }

  getEcrDateTime(timeout?: number): { error: InposExtError; dateTime: Date | null } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, dateTime: null };
    const arr = [0];
    const err = this.fn.ecrDatetime(timeout || this.DEFAULT_TIMEOUT, arr);
    return { error: err, dateTime: arr[0] > 0 ? new Date(arr[0] * 1000) : null };
  }

  // ─── Satış Limiti ──────────────────────────────────────────

  getSaleLimit(timeout?: number): { error: InposExtError; limit: number } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, limit: 0 };
    const arr = [BigInt(0)];
    const err = this.fn.saleLimit(timeout || this.DEFAULT_TIMEOUT, arr);
    return { error: err, limit: Number(arr[0]) };
  }

  // ─── Tuş Kilidi ────────────────────────────────────────────

  blockEcrKeys(): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.fn.blockKeys();
  }

  unblockEcrKeys(): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.fn.unblockKeys();
  }

  getKeyBlockStatus(timeout?: number): { error: InposExtError; blocked: boolean } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, blocked: false };
    const arr = [0];
    const err = this.fn.keyBlockStatus(timeout || this.DEFAULT_TIMEOUT, arr);
    return { error: err, blocked: arr[0] !== 0 };
  }

  // ─── Kısım Bilgisi ────────────────────────────────────────

  getSectionData(section: number, timeout?: number): { error: InposExtError; info: InposSectionInfo } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, info: { section, name: '', vatRate: 0 } };
    const itemBuf = Buffer.alloc(256);
    itemBuf.writeUInt8(section, 121);
    // section_data fonksiyonunu doğrudan çağırmak yerine, addSaleItem struct'ından okuyoruz
    // Bu fonksiyon DLL'de mevcut değilse graceful fail eder
    try {
      if (!this.fn.sectionData) {
        this.fn.sectionData = this.lib.stdcall('inposext_section_data', 'int', ['uint32', 'void *']);
      }
      const err = this.fn.sectionData(timeout || this.DEFAULT_TIMEOUT, itemBuf);
      const name = itemBuf.toString('utf-8', 24, 24 + 96).replace(/\0/g, '').trim();
      const vatRate = itemBuf.readUInt32LE(8);
      return { error: err, info: { section, name, vatRate } };
    } catch {
      return { error: InposExtError.InposNotInitializedError, info: { section, name: '', vatRate: 0 } };
    }
  }

  // ─── Yazıcı / Hata ────────────────────────────────────────

  checkPrinterPaper(timeout?: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.fn.checkPaper(timeout || this.DEFAULT_TIMEOUT);
  }

  getErrorDetail(): number {
    if (!this.lib) return 0;
    return this.fn.errorDetail();
  }

  // ─── Durum Bilgisi ─────────────────────────────────────────

  getConnectionStatus(timeout?: number): InposConnectionStatus {
    if (!this.lib || !this.connected) {
      return { connected: false };
    }
    const ecrSaleState = this.getEcrSaleState(timeout);
    const lastZ = this.getLastZDateTime(timeout);
    const ecrDt = this.getEcrDateTime(timeout);
    const limit = this.getSaleLimit(timeout);

    if (ecrSaleState.error === InposExtError.InposConnectionError) {
      this.connected = false;
      return { connected: false };
    }

    return {
      connected: true,
      serialNo: this.activeSerialNo,
      lastZDateTime: lastZ.dateTime?.toISOString() || undefined,
      ecrDateTime: ecrDt.dateTime?.toISOString() || undefined,
      saleLimit: limit.limit,
      ecrState: ecrSaleState.ecrState,
      saleState: ecrSaleState.saleState,
    };
  }

  // ─── Yardımcılar ───────────────────────────────────────────

  private parseTotals(buf: Buffer): InposSaleTotals {
    return {
      totalAmount: Number(buf.readBigUInt64LE(0)),
      totalVat: Number(buf.readBigUInt64LE(8)),
      amountToPay: Number(buf.readBigUInt64LE(16)),
      cashPaymentAmount: Number(buf.readBigUInt64LE(24)),
      creditCardPaymentAmount: Number(buf.readBigUInt64LE(32)),
      itemCount: buf.readUInt32LE(40),
    };
  }

  private emptyTotals(): InposSaleTotals {
    return { totalAmount: 0, totalVat: 0, amountToPay: 0, cashPaymentAmount: 0, creditCardPaymentAmount: 0, itemCount: 0 };
  }
}
