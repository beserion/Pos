import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InposBridgeService } from './inpos-bridge.service';
import { KitchenGateway } from '../orders/kitchen.gateway';
import { InposConfig } from './inpos-config.entity';
import {
  InposExtError, InposEcrState, InposEcrSaleState, InposPaymentType,
  InposSaleItemData, InposSaleResult, InposPaymentInfo, InposUnit,
  InposConnectionConfig, InposConnectionStatus, InposInvoiceInfo,
  InposSectionInfo, getErrorName,
} from './inpos.types';

@Injectable()
export class InposService implements OnModuleInit {
  private readonly logger = new Logger(InposService.name);
  private readonly TIMEOUT = 5000;
  private readonly MAX_RETRY = 10;

  constructor(
    private readonly bridge: InposBridgeService,
    @InjectRepository(InposConfig)
    private readonly configRepo: Repository<InposConfig>,
    private readonly kitchenGateway: KitchenGateway,
  ) {}

  async onModuleInit() {
    this.logger.log('inPOS Auto-connect initializing...');
    // Sunucunun ayağa kalkması ve DLL'in hazır olması için kısa bir süre bekle
    setTimeout(async () => {
      try {
        const config = await this.configRepo.findOne({ where: { companyId: 1 } });
        if (config && config.serialNo) {
          this.logger.log(`Attempting auto-connect to inPOS ECR ${config.serialNo} at ${config.listenIp}:${config.port}...`);
          const status = await this.connect({
            serialNo: config.serialNo,
            listenIp: config.listenIp || '0.0.0.0',
            port: config.port || 8000
          });

          if (status.connected) {
            this.logger.log('inPOS ECR Auto-connect successful!');
            this.kitchenGateway.notifyEcrStatus({ connected: true, message: 'Yazarkasa otomatik olarak bağlandı.' });
          } else {
            this.logger.warn('inPOS ECR Auto-connect failed.');
            this.kitchenGateway.notifyEcrStatus({ connected: false, message: 'Yazarkasa otomatik bağlantısı başarısız oldu.' });
          }
        } else {
          this.logger.log('No inPOS ECR configuration found for auto-connect.');
        }
      } catch (err) {
        this.logger.error('Error during inPOS auto-connect:', err.message);
      }
    }, 5000); // 5 saniye sonra dene
  }

  // ─── Bağlantı Yönetimi ────────────────────────────────────

  /** Yazarkasaya bağlan (retry döngüsü ile) */
  async connect(config: InposConnectionConfig): Promise<InposConnectionStatus> {
    let lastError = InposExtError.InposConnectionError;

    for (let i = 0; i < this.MAX_RETRY; i++) {
      lastError = await this.bridge.initialize(config);
      if (lastError === InposExtError.InposNoError) {
        // Login kontrolü
        const state = this.bridge.getEcrState(this.TIMEOUT);
        if (state.ecrState === InposEcrState.InposEcrLogin) {
          this.bridge.login(this.TIMEOUT);
          // Z raporu gerekli mi kontrol
          const afterLogin = this.bridge.getEcrState(this.TIMEOUT);
          if (afterLogin.ecrState === InposEcrState.InposEcrZReportRequired) {
            this.bridge.zReport();
          }
        }
        return this.bridge.getConnectionStatus(this.TIMEOUT);
      }
      if (lastError !== InposExtError.InposConnectionError) break;
      await this.sleep(500);
    }

    return { connected: false };
  }

  /** Bağlantıyı kes */
  disconnect(): void {
    this.bridge.close();
  }

  /** Bağlantı durumu */
  getStatus(): InposConnectionStatus {
    return this.bridge.getConnectionStatus(this.TIMEOUT);
  }

  // ─── Yüksek Seviyeli Satış Akışı ──────────────────────────

  /**
   * Normal satış yap — POS hesap kapatma entegrasyonu
   * items: satılacak kalemler
   * payments: ödeme bilgileri (nakit, kredi kartı, yemek kartı vb.)
   * cashierName: opsiyonel kasiyer adı
   */
  async processSale(
    items: InposSaleItemData[],
    payments: InposPaymentInfo[],
    cashierName?: string,
  ): Promise<InposSaleResult> {
    if (!this.bridge.isConnected()) {
      return { success: false, error: 'Yazarkasa bağlantısı yok', errorCode: InposExtError.InposNotInitializedError };
    }

    try {
      // 1) Cihaz durumunu kontrol et ve hazırla
      const readyErr = await this.ensureReadyForSale();
      if (readyErr !== InposExtError.InposNoError) {
        return { success: false, error: `Yazarkasa hazır değil: ${getErrorName(readyErr)}`, errorCode: readyErr };
      }

      // 2) Kasiyer adı ayarla
      if (cashierName) {
        this.bridge.setCashierName(cashierName, this.TIMEOUT);
      }

      // 3) Satış başlat
      const startErr = this.bridge.startSale(this.TIMEOUT);
      if (startErr !== InposExtError.InposNoError) {
        return { success: false, error: `Satış başlatılamadı: ${getErrorName(startErr)}`, errorCode: startErr };
      }

      // 4) Kalemleri ekle
      for (const item of items) {
        const addResult = this.bridge.addSaleItem(item, this.TIMEOUT);
        if (addResult.error !== InposExtError.InposNoError) {
          this.bridge.cancelSale(this.TIMEOUT);
          return { success: false, error: `Kalem eklenemedi (${item.name}): ${getErrorName(addResult.error)}`, errorCode: addResult.error };
        }
      }

      // 5) Ödemeleri gönder
      for (const payment of payments) {
        const payErr = this.bridge.addPayment(payment.type, payment.amount);
        if (payErr !== InposExtError.InposNoError) {
          return { success: false, error: `Ödeme gönderilemedi: ${getErrorName(payErr)}`, errorCode: payErr };
        }

        // Kredi kartı ise transaction bitmesini bekle
        if (payment.type === InposPaymentType.CreditCardPayment) {
          const waitErr = await this.waitForTransaction();
          if (waitErr !== InposExtError.InposNoError) {
            return { success: false, error: `Kart işlemi başarısız: ${getErrorName(waitErr)}`, errorCode: waitErr };
          }
        }
      }

      // 6) Satışın tamamlanmasını bekle
      const result = await this.waitForSaleCompletion();
      return result;

    } catch (err) {
      this.logger.error(`Satış hatası: ${err.message}`);
      return { success: false, error: `Beklenmeyen hata: ${err.message}` };
    }
  }

  /**
   * Faturalı satış yap
   */
  async processSaleWithInvoice(
    items: InposSaleItemData[],
    payments: InposPaymentInfo[],
    invoiceData: InposInvoiceInfo,
    cashierName?: string,
  ): Promise<InposSaleResult> {
    if (!this.bridge.isConnected()) {
      return { success: false, error: 'Yazarkasa bağlantısı yok', errorCode: InposExtError.InposNotInitializedError };
    }

    try {
      const readyErr = await this.ensureReadyForSale();
      if (readyErr !== InposExtError.InposNoError) {
        return { success: false, error: `Yazarkasa hazır değil: ${getErrorName(readyErr)}`, errorCode: readyErr };
      }

      if (cashierName) {
        this.bridge.setCashierName(cashierName, this.TIMEOUT);
      }

      // Faturalı satış başlat
      const startErr = this.bridge.startSaleWithInvoice(this.TIMEOUT);
      if (startErr !== InposExtError.InposNoError) {
        return { success: false, error: `Faturalı satış başlatılamadı: ${getErrorName(startErr)}`, errorCode: startErr };
      }

      // Kalemler
      for (const item of items) {
        const addResult = this.bridge.addSaleItem(item, this.TIMEOUT);
        if (addResult.error !== InposExtError.InposNoError) {
          this.bridge.cancelSale(this.TIMEOUT);
          return { success: false, error: `Kalem eklenemedi: ${getErrorName(addResult.error)}`, errorCode: addResult.error };
        }
      }

      // Ödemeler
      for (const payment of payments) {
        const payErr = this.bridge.addPayment(payment.type, payment.amount);
        if (payErr !== InposExtError.InposNoError) {
          return { success: false, error: `Ödeme gönderilemedi: ${getErrorName(payErr)}`, errorCode: payErr };
        }
        if (payment.type === InposPaymentType.CreditCardPayment) {
          await this.waitForTransaction();
        }
      }

      // Fatura ile sonlandır
      const ecrCheck = this.bridge.getEcrState(this.TIMEOUT);
      if (ecrCheck.ecrState === InposEcrState.InposEcrSaleWithInvoice) {
        const invErr = this.bridge.endSaleWithInvoice(invoiceData);
        if (invErr !== InposExtError.InposNoError) {
          return { success: false, error: `Fatura sonlandırılamadı: ${getErrorName(invErr)}`, errorCode: invErr };
        }
      }

      return await this.waitForSaleCompletion();

    } catch (err) {
      this.logger.error(`Faturalı satış hatası: ${err.message}`);
      return { success: false, error: `Beklenmeyen hata: ${err.message}` };
    }
  }

  // ─── Rapor İşlemleri ───────────────────────────────────────

  getXReport(): { error: InposExtError } {
    const err = this.bridge.xReport();
    return { error: err };
  }

  getZReport(): { error: InposExtError } {
    const err = this.bridge.zReport();
    return { error: err };
  }

  getCurrentZ(): { error: InposExtError; zNo: number } {
    return this.bridge.getCurrentZ(this.TIMEOUT);
  }

  // ─── Tuş Kilidi ────────────────────────────────────────────

  blockKeys(): { error: InposExtError } {
    return { error: this.bridge.blockEcrKeys() };
  }

  unblockKeys(): { error: InposExtError } {
    return { error: this.bridge.unblockEcrKeys() };
  }

  getKeyBlockStatus(): { error: InposExtError; blocked: boolean } {
    return this.bridge.getKeyBlockStatus(this.TIMEOUT);
  }

  // ─── Kısım Bilgileri ──────────────────────────────────────

  getSectionData(section: number): { error: InposExtError; info: InposSectionInfo } {
    return this.bridge.getSectionData(section, this.TIMEOUT);
  }

  getAllSections(): InposSectionInfo[] {
    const sections: InposSectionInfo[] = [];
    for (let i = 1; i <= 8; i++) {
      const result = this.bridge.getSectionData(i, this.TIMEOUT);
      if (result.error === InposExtError.InposNoError) {
        sections.push(result.info);
      }
    }
    return sections;
  }

  // ─── Ayarlar (Veritabanı) ──────────────────────────────────

  async getConfig(companyId: number): Promise<InposConfig | null> {
    return this.configRepo.findOne({ where: { companyId } });
  }

  async saveConfig(data: Partial<InposConfig>, companyId: number): Promise<InposConfig> {
    let config = await this.configRepo.findOne({ where: { companyId } });
    if (config) {
      Object.assign(config, data);
      return this.configRepo.save(config);
    }
    const newConfig = this.configRepo.create({ ...data, companyId });
    return this.configRepo.save(newConfig);
  }

  // ─── Dahili Yardımcılar ────────────────────────────────────

  /** Cihazı satışa hazır duruma getir */
  private async ensureReadyForSale(): Promise<InposExtError> {
    const { error, ecrState } = this.bridge.getEcrState(this.TIMEOUT);
    if (error !== InposExtError.InposNoError) return error;

    if (ecrState === InposEcrState.InposEcrLogin) {
      const loginErr = this.bridge.login(this.TIMEOUT);
      if (loginErr !== InposExtError.InposNoError) return loginErr;
      await this.sleep(100);
      const afterLogin = this.bridge.getEcrState(this.TIMEOUT);
      if (afterLogin.ecrState === InposEcrState.InposEcrZReportRequired) {
        this.bridge.zReport();
        await this.sleep(2000);
      }
    }

    const check = this.bridge.getEcrState(this.TIMEOUT);
    if (check.ecrState === InposEcrState.InposEcrMainMenu || check.ecrState === InposEcrState.InposEcrIdle) {
      return InposExtError.InposNoError;
    }
    if (check.ecrState === InposEcrState.InposEcrSale) {
      return InposExtError.InposNoError; // zaten satışta
    }

    return InposExtError.InposInvalidEcrStateError;
  }

  /** Kredi kartı transaction bitmesini bekle */
  private async waitForTransaction(): Promise<InposExtError> {
    for (let i = 0; i < 120; i++) { // max 2 dakika
      const state = this.bridge.getEcrSaleState(this.TIMEOUT);
      if (state.error !== InposExtError.InposNoError) return state.error;
      if (state.saleState !== InposEcrSaleState.InposSaleWaitingForTransactionCompleted) {
        return InposExtError.InposNoError;
      }
      await this.sleep(1000);
    }
    return InposExtError.InposConnectionError;
  }

  /** Satış tamamlanmasını bekle ve fiş bilgisini döndür */
  private async waitForSaleCompletion(): Promise<InposSaleResult> {
    for (let i = 0; i < 30; i++) {
      const state = this.bridge.getEcrSaleState(this.TIMEOUT);
      if (state.error !== InposExtError.InposNoError) {
        return { success: false, error: `Durum sorgusu hatası: ${getErrorName(state.error)}`, errorCode: state.error };
      }

      if (state.ecrState === InposEcrState.InposEcrMainMenu ||
          state.saleState === InposEcrSaleState.InposSaleDataFinalized ||
          state.saleState === InposEcrSaleState.InposSaleIdle) {

        const saleResult = this.bridge.getSaleState(this.TIMEOUT);
        return {
          success: true,
          receiptNo: saleResult.receipt.receiptNo,
          zNo: saleResult.receipt.zNo,
          totals: saleResult.totals,
        };
      }
      await this.sleep(1000);
    }

    // Timeout — ama satış alınmış olabilir
    const fallback = this.bridge.getSaleState(this.TIMEOUT);
    if (fallback.receipt.receiptNo > 0) {
      return { success: true, receiptNo: fallback.receipt.receiptNo, zNo: fallback.receipt.zNo, totals: fallback.totals };
    }
    return { success: false, error: 'Satış tamamlanma zaman aşımı' };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
