import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as path from 'path';
import {
  InposExtError, InposEcrState, InposEcrSaleState, InposPaymentType,
  InposSaleItemData, InposSaleTotals, InposSaleReceiptData, InposSectionInfo,
  InposConnectionConfig, InposConnectionStatus, InposInvoiceInfo,
  InposInvoiceType, InposCustomerNoType, getErrorName,
} from './inpos.types';

// ffi-napi ve ref-napi tipleri (opsiyonel — DLL yoksa graceful degrade)
let ffi: any = null;
let ref: any = null;
let StructType: any = null;
let ArrayType: any = null;

try {
  ffi = require('ffi-napi');
  ref = require('ref-napi');
  StructType = require('ref-struct-napi');
  ArrayType = require('ref-array-napi');
} catch {
  // ffi-napi kurulu değilse servis mock modda çalışır
}

@Injectable()
export class InposBridgeService implements OnModuleDestroy {
  private readonly logger = new Logger(InposBridgeService.name);
  private lib: any = null;
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
    if (!ffi) {
      this.logger.warn('ffi-napi bulunamadı. inPOS bridge mock modda çalışacak.');
      return;
    }

    const dllPath = path.resolve(__dirname, '..', '..', 'lib', 'inpos', 'inposext.dll');
    try {
      this.lib = ffi.Library(dllPath, {
        'inposext_version':             ['string', []],
        'inposext_initialize':          ['int', ['uint32', 'string', 'string', 'uint16', 'uint32']],
        'inposext_close':               ['void', []],
        'inposext_close_all':           ['void', []],
        'inposext_set_active_device':   ['int', ['string']],
        'inposext_active_device':       ['int', ['pointer']],
        'inposext_login':               ['int', ['uint32']],
        'inposext_logout':              ['int', ['uint32']],
        'inposext_set_cashier_name':    ['int', ['uint32', 'string']],
        'inposext_ecr_state':           ['int', ['uint32', 'pointer']],
        'inposext_ecr_sale_state':      ['int', ['uint32', 'pointer', 'pointer']],
        'inposext_start_sale':          ['int', ['uint32']],
        'inposext_start_sale_with_invoice': ['int', ['uint32']],
        'inposext_add_sale_item':       ['int', ['uint32', 'pointer', 'pointer']],
        'inposext_add_payment':         ['int', ['int', 'uint64']],
        'inposext_end_sale':            ['int', ['int']],
        'inposext_end_sale_with_invoice': ['int', ['pointer']],
        'inposext_cancel_sale':         ['int', ['uint32']],
        'inposext_sale_state':          ['int', ['uint32', 'pointer', 'pointer', 'pointer']],
        'inposext_receipt_data':        ['int', ['uint32', 'pointer', 'pointer']],
        'inposext_section_data':        ['int', ['uint32', 'pointer']],
        'inposext_x_report':            ['int', []],
        'inposext_z_report':            ['int', []],
        'inposext_current_z':           ['int', ['uint32', 'pointer']],
        'inposext_last_z_datetime':     ['int', ['uint32', 'pointer']],
        'inposext_ecr_datetime':        ['int', ['uint32', 'pointer']],
        'inposext_sale_limit':          ['int', ['uint32', 'pointer']],
        'inposext_block_ecr_keys':      ['int', []],
        'inposext_unblock_ecr_keys':    ['int', []],
        'inposext_ecr_key_blocking_status': ['int', ['uint32', 'pointer']],
        'inposext_check_printer_paper': ['int', ['uint32']],
        'inposext_set_sale_type':       ['int', ['uint32', 'int']],
        'inposext_sale_type':           ['int', ['uint32', 'pointer']],
        'inposext_error_detail':        ['int', []],
        'inposext_end_sale_with_returned_items_slip': ['int', ['int']],
      });
      const ver = this.lib.inposext_version();
      this.logger.log(`inPOS DLL yüklendi. Sürüm: ${ver}`);
    } catch (err) {
      this.logger.error(`inPOS DLL yüklenemedi: ${err.message}`);
      this.lib = null;
    }
  }

  /** DLL yüklü mü */
  isLibraryLoaded(): boolean {
    return this.lib !== null;
  }

  /** Bağlantı durumu */
  isConnected(): boolean {
    return this.connected;
  }

  // ─── Bağlantı ──────────────────────────────────────────────

  /** Yazarkasaya bağlan */
  async initialize(config: InposConnectionConfig): Promise<InposExtError> {
    if (!this.lib) return InposExtError.InposNotInitializedError;

    const appNo = config.applicationNo || 1;
    const timeout = config.timeout || 700;

    const err: number = this.lib.inposext_initialize(
      appNo,
      config.serialNo.toUpperCase(),
      config.listenIp,
      config.port,
      timeout,
    );

    if (err === InposExtError.InposNoError) {
      this.connected = true;
      this.activeSerialNo = config.serialNo;
      this.logger.log(`Yazarkasa bağlantısı kuruldu: ${config.serialNo}`);
    }
    return err as InposExtError;
  }

  /** Aktif cihaz bağlantısını kapat */
  close(): void {
    if (!this.lib) return;
    this.lib.inposext_close();
    this.connected = false;
    this.logger.log('Yazarkasa bağlantısı kapatıldı.');
  }

  /** Tüm bağlantıları kapat */
  closeAll(): void {
    if (!this.lib) return;
    this.lib.inposext_close_all();
    this.connected = false;
  }

  // ─── Durum Sorgu ───────────────────────────────────────────

  /** Yazarkasa durumunu sorgula */
  getEcrState(timeout?: number): { error: InposExtError; ecrState: InposEcrState } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, ecrState: InposEcrState.InposEcrInitialization };
    const stateBuf = Buffer.alloc(4);
    const err = this.lib.inposext_ecr_state(timeout || this.DEFAULT_TIMEOUT, stateBuf);
    return { error: err, ecrState: stateBuf.readInt32LE(0) };
  }

  /** Yazarkasa ve satış durumunu sorgula */
  getEcrSaleState(timeout?: number): { error: InposExtError; ecrState: InposEcrState; saleState: InposEcrSaleState } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, ecrState: InposEcrState.InposEcrInitialization, saleState: InposEcrSaleState.InposSaleIdle };
    const ecrBuf = Buffer.alloc(4);
    const saleBuf = Buffer.alloc(4);
    const err = this.lib.inposext_ecr_sale_state(timeout || this.DEFAULT_TIMEOUT, ecrBuf, saleBuf);
    return { error: err, ecrState: ecrBuf.readInt32LE(0), saleState: saleBuf.readInt32LE(0) };
  }

  // ─── Kasiyer ───────────────────────────────────────────────

  login(timeout?: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.lib.inposext_login(timeout || this.DEFAULT_TIMEOUT);
  }

  logout(timeout?: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.lib.inposext_logout(timeout || this.DEFAULT_TIMEOUT);
  }

  setCashierName(name: string, timeout?: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.lib.inposext_set_cashier_name(timeout || this.DEFAULT_TIMEOUT, name);
  }

  // ─── Satış ─────────────────────────────────────────────────

  startSale(timeout?: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.lib.inposext_start_sale(timeout || this.DEFAULT_TIMEOUT);
  }

  startSaleWithInvoice(timeout?: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.lib.inposext_start_sale_with_invoice(timeout || this.DEFAULT_TIMEOUT);
  }

  /** Satış kalemi ekle — C struct olarak gönderir */
  addSaleItem(item: InposSaleItemData, timeout?: number): { error: InposExtError; totals: InposSaleTotals } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, totals: this.emptyTotals() };

    // InposEcrSaleItem struct'ını oluştur (C layout ile uyumlu)
    // unitPrice(8) + multiplier(4) + discountRate(4) + discountAmount(8) + name(97) + section(1) + unit(4) + padding
    const itemBuf = Buffer.alloc(256); // geniş tut
    itemBuf.writeBigUInt64LE(BigInt(item.unitPrice), 0);
    itemBuf.writeUInt32LE(item.multiplier, 8);
    itemBuf.writeInt32LE(item.discountRate, 12);
    itemBuf.writeBigUInt64LE(BigInt(item.discountAmount), 16);
    // name: 97 byte (96+1 null), offset 24
    const nameBuf = Buffer.from(item.name, 'utf-8');
    nameBuf.copy(itemBuf, 24, 0, Math.min(nameBuf.length, 96));
    itemBuf[24 + Math.min(nameBuf.length, 96)] = 0;
    // section: offset 24+97 = 121
    itemBuf.writeUInt8(item.section, 121);
    // unit: offset 124 (aligned)
    itemBuf.writeInt32LE(item.unit, 124);

    const totalsBuf = Buffer.alloc(48);
    const err = this.lib.inposext_add_sale_item(timeout || this.DEFAULT_TIMEOUT, itemBuf, totalsBuf);
    return { error: err, totals: this.parseTotals(totalsBuf) };
  }

  /** Ödeme ekle */
  addPayment(paymentType: InposPaymentType, amount: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.lib.inposext_add_payment(paymentType, amount);
  }

  /** Satışı sonlandır */
  endSale(paymentType: InposPaymentType): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.lib.inposext_end_sale(paymentType);
  }

  /** Faturalı satışı sonlandır */
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
    return this.lib.inposext_end_sale_with_invoice(buf);
  }

  /** Satışı iptal et */
  cancelSale(timeout?: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.lib.inposext_cancel_sale(timeout || this.DEFAULT_TIMEOUT);
  }

  /** Satış durumunu sorgula */
  getSaleState(timeout?: number): { error: InposExtError; saleState: InposEcrSaleState; totals: InposSaleTotals; receipt: InposSaleReceiptData } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, saleState: InposEcrSaleState.InposSaleIdle, totals: this.emptyTotals(), receipt: { receiptNo: 0, zNo: 0 } };
    const saleBuf = Buffer.alloc(4);
    const totalsBuf = Buffer.alloc(48);
    const receiptBuf = Buffer.alloc(16);
    const err = this.lib.inposext_sale_state(timeout || this.DEFAULT_TIMEOUT, saleBuf, totalsBuf, receiptBuf);
    return {
      error: err,
      saleState: saleBuf.readInt32LE(0),
      totals: this.parseTotals(totalsBuf),
      receipt: { receiptNo: receiptBuf.readUInt32LE(0), zNo: receiptBuf.readUInt32LE(4) },
    };
  }

  /** Fiş bilgisi sorgula */
  getReceiptData(receipt: InposSaleReceiptData, timeout?: number): { error: InposExtError; totals: InposSaleTotals } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, totals: this.emptyTotals() };
    const rBuf = Buffer.alloc(16);
    rBuf.writeUInt32LE(receipt.receiptNo, 0);
    rBuf.writeUInt32LE(receipt.zNo, 4);
    const totalsBuf = Buffer.alloc(48);
    const err = this.lib.inposext_receipt_data(timeout || this.DEFAULT_TIMEOUT, rBuf, totalsBuf);
    return { error: err, totals: this.parseTotals(totalsBuf) };
  }

  // ─── Satış Tipi ────────────────────────────────────────────

  setSaleType(saleType: number, timeout?: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.lib.inposext_set_sale_type(timeout || this.DEFAULT_TIMEOUT, saleType);
  }

  // ─── Raporlar ──────────────────────────────────────────────

  xReport(): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.lib.inposext_x_report();
  }

  zReport(): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.lib.inposext_z_report();
  }

  getCurrentZ(timeout?: number): { error: InposExtError; zNo: number } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, zNo: 0 };
    const buf = Buffer.alloc(4);
    const err = this.lib.inposext_current_z(timeout || this.DEFAULT_TIMEOUT, buf);
    return { error: err, zNo: buf.readUInt32LE(0) };
  }

  // ─── Tarih/Saat ────────────────────────────────────────────

  getLastZDateTime(timeout?: number): { error: InposExtError; dateTime: Date | null } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, dateTime: null };
    const buf = Buffer.alloc(4);
    const err = this.lib.inposext_last_z_datetime(timeout || this.DEFAULT_TIMEOUT, buf);
    const secs = buf.readInt32LE(0);
    return { error: err, dateTime: secs > 0 ? new Date(secs * 1000) : null };
  }

  getEcrDateTime(timeout?: number): { error: InposExtError; dateTime: Date | null } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, dateTime: null };
    const buf = Buffer.alloc(4);
    const err = this.lib.inposext_ecr_datetime(timeout || this.DEFAULT_TIMEOUT, buf);
    const secs = buf.readInt32LE(0);
    return { error: err, dateTime: secs > 0 ? new Date(secs * 1000) : null };
  }

  // ─── Satış Limiti ──────────────────────────────────────────

  getSaleLimit(timeout?: number): { error: InposExtError; limit: number } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, limit: 0 };
    const buf = Buffer.alloc(8);
    const err = this.lib.inposext_sale_limit(timeout || this.DEFAULT_TIMEOUT, buf);
    return { error: err, limit: Number(buf.readBigUInt64LE(0)) };
  }

  // ─── Tuş Kilidi ────────────────────────────────────────────

  blockEcrKeys(): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.lib.inposext_block_ecr_keys();
  }

  unblockEcrKeys(): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.lib.inposext_unblock_ecr_keys();
  }

  getKeyBlockStatus(timeout?: number): { error: InposExtError; blocked: boolean } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, blocked: false };
    const buf = Buffer.alloc(4);
    const err = this.lib.inposext_ecr_key_blocking_status(timeout || this.DEFAULT_TIMEOUT, buf);
    return { error: err, blocked: buf.readInt32LE(0) !== 0 };
  }

  // ─── Kısım Bilgisi ────────────────────────────────────────

  getSectionData(section: number, timeout?: number): { error: InposExtError; info: InposSectionInfo } {
    if (!this.lib) return { error: InposExtError.InposNotInitializedError, info: { section, name: '', vatRate: 0 } };
    const itemBuf = Buffer.alloc(256);
    itemBuf.writeUInt8(section, 121); // section offset
    const err = this.lib.inposext_section_data(timeout || this.DEFAULT_TIMEOUT, itemBuf);
    const name = itemBuf.toString('utf-8', 24, 24 + 96).replace(/\0/g, '').trim();
    const vatRate = itemBuf.readUInt32LE(8); // multiplier alanı
    return { error: err, info: { section, name, vatRate } };
  }

  // ─── Yazıcı Kağıt Kontrolü ────────────────────────────────

  checkPrinterPaper(timeout?: number): InposExtError {
    if (!this.lib) return InposExtError.InposNotInitializedError;
    return this.lib.inposext_check_printer_paper(timeout || this.DEFAULT_TIMEOUT);
  }

  // ─── Hata Detayı ──────────────────────────────────────────

  getErrorDetail(): number {
    if (!this.lib) return 0;
    return this.lib.inposext_error_detail();
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
