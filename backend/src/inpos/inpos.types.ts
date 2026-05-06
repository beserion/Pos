// ─────────────────────────────────────────────────────────────
// inPOS SDK Tipleri — inposext_types.h'den TypeScript'e çevrildi
// ─────────────────────────────────────────────────────────────

/** Hata kodları */
export enum InposExtError {
  InposNoError = 0,
  InposNotInitializedError = 1,
  InposConnectionError = 2,
  InposNullArgumentError = 3,
  InposInvalidArgumentError = 4,
  InposMessageParsingError = 5,
  InposInvalidEcrStateError = 6,
  InposInvalidSaleStateError = 7,
  InposInvalidOperationError = 8,
  InposNoPrinterPaperError = 9,
  InposGmp3PairingError = 10,
  InposGmp3EncryptionError = 11,
  InposGmp3PacketError = 12,
  InposGmp3ApplicationHashError = 13,
  InposExternalPrinterError = 14,
  InposReportPrintingError = 15,
  InposPayloadSizeError = 16,
  InposTsmConnectionError = 17,
}

/** Yazarkasa durumları */
export enum InposEcrState {
  InposEcrInitialization = 0,
  InposEcrIdle = 1,
  InposEcrNotUsable = 2,
  InposEcrError = 3,
  InposEcrLogin = 4,
  InposEcrSale = 5,
  InposEcrSaleWithInvoice = 6,
  InposEcrMainMenu = 7,
  InposEcrReports = 8,
  InposEcrZReportRequired = 9,
  InposEcrPrintingMerchantSlip = 10,
  InposEcrInsertedCardCheck = 11,
  InposEcrPaymentApplicationActive = 12,
  InposEcrSaleWithCardPaymentCanceled = 13,
  InposEcrMealcardApplicationSelection = 14,
}

/** Satış durumları */
export enum InposEcrSaleState {
  InposSaleIdle = 0,
  InposSaleWaitingForInput = 1,
  InposSaleWaitingCancelLastItemResponse = 2,
  InposSaleWaitingCancelSaleResponse = 3,
  InposSaleWaitingForSection = 4,
  InposSaleWaitingForCustomerId = 5,
  InposSaleWaitingForTransactionCompleted = 6,
  InposSaleLimitReachedWithLastItem = 7,
  InposSaleLimitReachedWithAddedAmount = 8,
  InposSaleUndefinedPluItem = 9,
  InposSaleInvalidSectionOfPluItem = 10,
  InposSaleInvalidVatRateOfPluItem = 11,
  InposSaleUndefinedSection = 12,
  InposSaleUndefinedVatRate = 13,
  InposSaleInvalidAmount = 14,
  InposSaleDataFinalized = 15,
}

/** Satış tipleri */
export enum InposSaleType {
  SaleWithReceiptType = 0,
  SaleWithInvoiceType = 1,
  SaleWithMealCardType = 2,
  AdvancePaymentType = 3,
  DelayedPaymentType = 4,
  ReturnedItemsSlipType = 5,
}

/** Ödeme tipleri */
export enum InposPaymentType {
  CreditCardPayment = 0,
  CashPayment = 1,
  MealCardPayment = 2,
  CreditPayment = 3,
  NoPayment = 4,
  OpenAccount = 5,
  MoneyTransfer = 6,
}

/** Birim tipleri */
export enum InposUnit {
  Quantity = 0,
  Gram = 1,
  Kilogram = 2,
  Tonne = 3,
  Milliliter = 4,
  Liter = 5,
  Meter = 6,
  Kilometer = 7,
  Portion = 8,
}

/** Müşteri No Tipi */
export enum InposCustomerNoType {
  Id = 0,       // TCKN
  TaxNo = 1,    // VKN
}

/** Fatura Tipi */
export enum InposInvoiceType {
  Invoice = 0,
  EInvoice = 1,
  EArchiveInvoice = 2,
}

// ─────────────────────────────────────────────────
// Interface'ler
// ─────────────────────────────────────────────────

/** Satış kalemi */
export interface InposSaleItemData {
  name: string;
  unitPrice: number;    // kuruş cinsinden: 12.50 TL → 1250
  multiplier: number;   // 1.2 adet → 1200 (x1000)
  discountRate: number; // yüzde olarak, negatif = indirim
  discountAmount: number; // kuruş cinsinden
  section: number;      // 1-8 arası KDV kısım numarası
  unit: InposUnit;
}

/** Satış toplamları */
export interface InposSaleTotals {
  totalAmount: number;
  totalVat: number;
  amountToPay: number;
  cashPaymentAmount: number;
  creditCardPaymentAmount: number;
  itemCount: number;
}

/** Fiş bilgisi */
export interface InposSaleReceiptData {
  receiptNo: number;
  zNo: number;
  eruNo?: number;
  dateTime?: number;
}

/** Fatura bilgisi */
export interface InposInvoiceInfo {
  invoiceType: InposInvoiceType;
  noType: InposCustomerNoType;
  customerNo: string;   // TCKN (11 hane) veya VKN (10 hane)
  invoiceNo: string;    // max 16 karakter
  slipCount: number;    // 1 veya 2
  printDeliveryNote: boolean;
}

/** Bağlantı ayarları */
export interface InposConnectionConfig {
  serialNo: string;     // 12 haneli cihaz sicil no
  listenIp: string;     // varsayılan: 0.0.0.0
  port: number;         // varsayılan: 8000
  applicationNo?: number; // varsayılan: 1
  timeout?: number;     // varsayılan: 5000ms
}

/** Bağlantı durumu */
export interface InposConnectionStatus {
  connected: boolean;
  serialNo?: string;
  lastZDateTime?: string;
  ecrDateTime?: string;
  saleLimit?: number;
  ecrState?: InposEcrState;
  saleState?: InposEcrSaleState;
}

/** Kısım bilgisi */
export interface InposSectionInfo {
  section: number;
  name: string;
  vatRate: number; // yüzde: %8 → 800
}

/** Satış sonucu */
export interface InposSaleResult {
  success: boolean;
  receiptNo?: number;
  zNo?: number;
  totals?: InposSaleTotals;
  error?: string;
  errorCode?: InposExtError;
}

/** Ödeme bilgisi (parçalı ödeme için) */
export interface InposPaymentInfo {
  type: InposPaymentType;
  amount: number; // kuruş cinsinden
}

/** Hata adlarını döndüren yardımcı */
export function getErrorName(error: InposExtError): string {
  const names: Record<number, string> = {
    [InposExtError.InposNoError]: 'Hata yok',
    [InposExtError.InposNotInitializedError]: 'Cihaz başlatılmamış',
    [InposExtError.InposConnectionError]: 'Bağlantı hatası',
    [InposExtError.InposNullArgumentError]: 'Boş parametre hatası',
    [InposExtError.InposInvalidArgumentError]: 'Geçersiz parametre',
    [InposExtError.InposMessageParsingError]: 'Mesaj ayrıştırma hatası',
    [InposExtError.InposInvalidEcrStateError]: 'Geçersiz yazarkasa durumu',
    [InposExtError.InposInvalidSaleStateError]: 'Geçersiz satış durumu',
    [InposExtError.InposInvalidOperationError]: 'Geçersiz işlem',
    [InposExtError.InposNoPrinterPaperError]: 'Yazıcıda kağıt yok',
    [InposExtError.InposGmp3PairingError]: 'GMP3 eşleme hatası',
    [InposExtError.InposExternalPrinterError]: 'Harici yazıcı hatası',
    [InposExtError.InposReportPrintingError]: 'Rapor basım hatası',
  };
  return names[error] || `Bilinmeyen hata (${error})`;
}

/** Yazarkasa durumu adını döndüren yardımcı */
export function getEcrStateName(state: InposEcrState): string {
  const names: Record<number, string> = {
    [InposEcrState.InposEcrInitialization]: 'Başlatılıyor',
    [InposEcrState.InposEcrIdle]: 'Boşta',
    [InposEcrState.InposEcrNotUsable]: 'Kullanılamaz',
    [InposEcrState.InposEcrError]: 'Hata',
    [InposEcrState.InposEcrLogin]: 'Giriş Ekranı',
    [InposEcrState.InposEcrSale]: 'Satış',
    [InposEcrState.InposEcrSaleWithInvoice]: 'Faturalı Satış',
    [InposEcrState.InposEcrMainMenu]: 'Ana Menü',
    [InposEcrState.InposEcrReports]: 'Raporlar',
    [InposEcrState.InposEcrZReportRequired]: 'Z Raporu Gerekli',
    [InposEcrState.InposEcrPrintingMerchantSlip]: 'Slip Basılıyor',
    [InposEcrState.InposEcrSaleWithCardPaymentCanceled]: 'Kart İptali Bekleniyor',
  };
  return names[state] || `Bilinmeyen durum (${state})`;
}
