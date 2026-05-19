import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BusinessDayLog } from './business-day-log.entity';
import { ClosedDayRecord } from './closed-day-record.entity';
import { ZReport } from './z-report.entity';
import { Shift } from '../shifts/shift.entity';
import { Sale } from '../sales/sale.entity';
import { ParametersService } from '../parameters/parameters.service';
import { FinanceService } from '../finance/finance.service';
import { PrintersService } from '../printers/printers.service';

@Injectable()
export class BusinessDayService {
  private readonly logger = new Logger(BusinessDayService.name);

  constructor(
    @InjectRepository(BusinessDayLog)
    private readonly logRepo: Repository<BusinessDayLog>,
    @InjectRepository(ClosedDayRecord)
    private readonly closedDayRepo: Repository<ClosedDayRecord>,
    @InjectRepository(ZReport)
    private readonly zReportRepo: Repository<ZReport>,
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    private readonly parametersService: ParametersService,
    private readonly financeService: FinanceService,
    private readonly printersService: PrintersService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Yardımcı: Bugünün gerçek tarihini al (Yerel YYYY-MM-DD) ────────
  private getRealDate(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - (offset * 60 * 1000));
    return localNow.toISOString().split('T')[0];
  }

  // ─── Yardımcı: İki tarih arasındaki eksik günleri hesapla ─────
  private getMissingDays(fromDate: string, toDate: string): string[] {
    const days: string[] = [];
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const current = new Date(start);
    current.setDate(current.getDate() + 1); // fromDate'den bir sonraki gün

    while (current < end) {
      days.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  // ─── 1) İş günü durum bilgisi ────────────────────────────────
  async getBusinessDayStatus(companyId: number = 1) {
    const realDate = this.getRealDate();
    const now = new Date();

    // Aktif program tarihi
    const activeBusinessDate = await this.getActiveBusinessDate(companyId);

    // Son başarılı gün sonu
    const lastEndOfDay = await this.getLastEndOfDay(companyId);

    // Açık vardiya sayısı
    const openShifts = await this.shiftRepo.find({
      where: { status: 'OPEN', companyId },
      relations: ['user', 'cashRegister'],
    });

    // Açık masa / adisyon sayısı
    let openTableCount = 0;
    let openSaleCount = 0;
    try {
      const tableRes = await this.dataSource.query(
        `SELECT COUNT(*) as cnt FROM tables WHERE status = 'DOLU'`,
      );
      openTableCount = Number(tableRes[0]?.cnt || 0);

      const saleRes = await this.dataSource.query(
        `SELECT COUNT(*) as cnt FROM sales WHERE status = 'ACTIVE' AND companyId = @0`,
        [companyId],
      );
      openSaleCount = Number(saleRes[0]?.cnt || 0);
    } catch (err) {
      this.logger.warn('Açık masa/adisyon sorgusu başarısız:', err);
    }

    // Tarih farkı analizi
    const dateDiff = this.calculateDateDiff(activeBusinessDate, realDate);
    const needsRollover = dateDiff > 0;
    const previousDayNotClosed = dateDiff > 0 || (dateDiff === 0 && !lastEndOfDay);

    // Kapalı gün devir kuyruğu
    const closedDayQueue = needsRollover
      ? this.getMissingDays(activeBusinessDate, realDate)
      : [];

    // Sorun var mı?
    // Sadece gelecek tarihte ise (hatalı durum) giriş engellenir.
    // Eğer activeBusinessDate <= realDate ise girişe izin verilir (canAccessSales = true).
    const hasIssues = activeBusinessDate > realDate;

    // Vardiyalı kasiyer sistemi aktif mi?
    const shiftSystemEnabled = (await this.parametersService.getValue('pos', 'shift_system_enabled')) !== 'false';

    return {
      activeBusinessDate,
      realDate,
      realDateTime: now.toISOString(),
      lastEndOfDay: lastEndOfDay
        ? {
            date: lastEndOfDay.businessDate,
            closedAt: lastEndOfDay.closedAt,
            zReportId: lastEndOfDay.id,
          }
        : null,
      openShiftCount: openShifts.length,
      openShifts: openShifts.map((s) => ({
        id: s.id,
        userId: s.userId,
        userName: s.user
          ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim()
          : `Kullanıcı #${s.userId}`,
        cashRegisterId: s.cashRegisterId,
        cashRegisterName: s.cashRegister?.name || `Kasa #${s.cashRegisterId}`,
        openedAt: s.openedAt,
        businessDate: s.businessDate,
      })),
      openTableCount,
      openSaleCount,
      dateDiff,
      needsRollover,
      closedDayQueue,
      hasIssues,
      canAccessSales: !hasIssues,
      shiftSystemEnabled,
    };
  }

  // ─── 2) Aktif program tarihini al ────────────────────────────
  async getActiveBusinessDate(companyId: number = 1): Promise<string> {
    // Önce parametreden bak
    const stored = await this.parametersService.getValue('pos', 'active_business_date');
    if (stored && stored.trim().length === 10) {
      return stored;
    }

    // Yoksa son Z-Raporu'na bak → bir sonraki gün
    const lastZ = await this.zReportRepo.findOne({
      where: { companyId },
      order: { businessDate: 'DESC', createdAt: 'DESC' },
    });

    if (lastZ) {
      const next = new Date(lastZ.businessDate);
      next.setDate(next.getDate() + 1);
      const nextStr = next.toISOString().split('T')[0];
      // Gerçek tarihten ileri olamaz
      const realDate = this.getRealDate();
      return nextStr > realDate ? realDate : nextStr;
    }

    // Hiç Z-Raporu yoksa bugün
    return this.getRealDate();
  }

  // ─── 3) Son gün sonu bilgisi ──────────────────────────────────
  async getLastEndOfDay(companyId: number = 1): Promise<ZReport | null> {
    return this.zReportRepo.findOne({
      where: { companyId },
      order: { businessDate: 'DESC', createdAt: 'DESC' },
    });
  }

  // ─── 4) Gün sonu al ──────────────────────────────────────────
  async performEndOfDay(
    userId: number,
    companyId: number = 1,
    note?: string,
    force: boolean = false,
  ): Promise<{ success: boolean; message: string; newBusinessDate?: string; zReportId?: number }> {
    const realDate = this.getRealDate();
    const now = new Date();
    const activeDate = await this.getActiveBusinessDate(companyId);

    // ── Koruma 1: Program tarihi ileri gidemez ──
    const nextDate = new Date(activeDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    if (nextDateStr > realDate && !force) {
      await this.writeLog({
        companyId,
        userId,
        actionType: 'END_OF_DAY_FUTURE_CONFIRM_REQUIRED',
        oldBusinessDate: activeDate,
        newBusinessDate: nextDateStr,
        note: `${activeDate} tarihi henüz bitmedi. Onay bekleniyor.`,
      });
      throw new BadRequestException(
        `CONFIRM_FUTURE_DATE|${activeDate} tarihi henüz bitmedi. Yine de bir sonraki güne (${nextDateStr}) geçmek istiyor musunuz?`,
      );
    }

    if (nextDateStr > realDate && force) {
      // 1 Günden fazla ileriye gitmeyi engelle (Güvenlik)
      const maxAllowed = new Date(realDate);
      maxAllowed.setDate(maxAllowed.getDate() + 1);
      const maxAllowedStr = maxAllowed.toISOString().split('T')[0];
      
      if (nextDateStr > maxAllowedStr) {
        throw new BadRequestException(`Program tarihi gerçek tarihten en fazla 1 gün ileride olabilir. (Maksimum: ${maxAllowedStr})`);
      }
    }

    // ── Koruma 2: 6 saat minimum aralık ──
    const minHoursStr = (await this.parametersService.getValue('pos', 'end_of_day_min_hours')) || '6';
    const minHours = Number(minHoursStr) || 6;

    const lastEndOfDayAtStr = await this.parametersService.getValue('pos', 'last_end_of_day_at');
    if (lastEndOfDayAtStr) {
      const lastEndOfDayAt = new Date(lastEndOfDayAtStr);
      const hoursDiff = (now.getTime() - lastEndOfDayAt.getTime()) / (1000 * 60 * 60);
      if (hoursDiff < minHours) {
        const remaining = Math.ceil((minHours - hoursDiff) * 60);
        await this.writeLog({
          companyId,
          userId,
          actionType: 'END_OF_DAY_6H_BLOCKED',
          oldBusinessDate: activeDate,
          note: `Son gün sonundan itibaren ${minHours} saat geçmeden tekrar gün sonu alınamaz. Kalan: ~${remaining} dk`,
        });
        throw new BadRequestException(
          `Son gün sonundan itibaren ${minHours} saat geçmeden tekrar gün sonu alınamaz. Yaklaşık ${remaining} dakika kaldı.`,
        );
      }
    }

    // ── Koruma 3: Açık vardiya kontrolü (parametrik) ──
    const shiftSystemEnabled = (await this.parametersService.getValue('pos', 'shift_system_enabled')) !== 'false';

    if (shiftSystemEnabled) {
      const openShifts = await this.shiftRepo.find({
        where: { status: 'OPEN', companyId },
        relations: ['user', 'cashRegister'],
      });

      if (openShifts.length > 0) {
        const shiftMode = (await this.parametersService.getValue('pos', 'shift_closure_mode')) || 'warn_only';

        if (shiftMode === 'mandatory_close') {
          throw new BadRequestException(
            `Tüm açık vardiyalar kapatılmadan gün sonu yapılamaz. ${openShifts.length} açık vardiya bulunmaktadır.`,
          );
        }

        // warn_only ve authorized_approval modlarında devam eder
        // Frontend'de uyarı gösterilir, authorized_approval için yetkili PIN doğrulaması yapılır
        await this.writeLog({
          companyId,
          userId,
          actionType: 'OPEN_SHIFT_WARNING',
          oldBusinessDate: activeDate,
          note: `Açık vardiya(lar) mevcut: ${openShifts.length} adet. Mod: ${shiftMode}`,
          metadata: JSON.stringify(
            openShifts.map((s) => ({
              shiftId: s.id,
              userId: s.userId,
              userName: s.user
                ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim()
                : undefined,
              cashRegisterId: s.cashRegisterId,
              cashRegisterName: s.cashRegister?.name,
              openedAt: s.openedAt,
            })),
          ),
        });
      }
    }

    // ── Açık masaları kontrol et ──
    let openTableCount = 0;
    try {
      const tableRes = await this.dataSource.query(
        `SELECT COUNT(*) as cnt FROM tables WHERE status = 'DOLU'`,
      );
      openTableCount = Number(tableRes[0]?.cnt || 0);
    } catch {}

    const blockIfTablesOpen = (await this.parametersService.getValue('pos', 'block_eod_if_tables_open')) === 'true';
    if (blockIfTablesOpen && openTableCount > 0) {
      throw new BadRequestException(
        `Açık masalar (ödenmemiş adisyonlar) varken gün sonu yapılamaz. Toplam ${openTableCount} açık masa bulunmaktadır.`,
      );
    }

    const autoCloseShifts = (await this.parametersService.getValue('pos', 'auto_close_shifts_on_eod')) !== 'false';

    // ── Açık vardiyaları otomatik kapat (Z-Raporu oluşturmayı bloklamaz) ──
    if (autoCloseShifts) {
      try {
        const openShifts = await this.shiftRepo.find({ where: { status: 'OPEN', companyId } });
        for (const openShift of openShifts) {
          const expResult = await this.dataSource.query(
            `SELECT ISNULL(SUM(CAST(paidAmountCash AS DECIMAL(12,2))), 0) as totalCashIn FROM sales WHERE shiftId = @0 AND status = 'COMPLETED'`,
            [openShift.id],
          );
          const totalCashIn = Number(expResult[0]?.totalCashIn || 0);
          const expectedCash = Number((openShift.openingCash + totalCashIn).toFixed(2));
          openShift.closedAt = now;
          openShift.status = 'CLOSED';
          openShift.closingCash = expectedCash;
          openShift.expectedCash = expectedCash;
          openShift.cashDifference = 0;
          openShift.note = (openShift.note || '') + ' [Gün sonu ile otomatik kapatıldı]';
          await this.shiftRepo.save(openShift);
        }
      } catch (shiftErr) {
        this.logger.warn('Açık vardiyalar kapatılırken hata (gün sonu devam ediyor):', shiftErr);
      }
    }

    // ── Gün sonu işlemi: Z raporu oluştur — businessDate bazlı, vardiyadan bağımsız ──
    const cashRegisters = await this.dataSource.query(
      `SELECT id FROM cash_registers WHERE companyId = @0 AND isActive = 1`,
      [companyId],
    );

    let totalCashAll = 0;
    let totalCardAll = 0;
    let totalBankAll = 0;
    let zReportId: number | null = null;
    let lastErrorMsg = '';

    // Aktif kasa yoksa tek genel rapor oluştururuz, varsa hem kasaları hem de kasasız satışları kapsarız
    const targetRegisters: Array<{ id: number | null }> = [...cashRegisters, { id: null }];
    let maxSales = -1;

    for (const cr of targetRegisters) {
      try {
        // Bu kasa + bu tarih için where koşulunu hazırla
        const existingWhere: any = { businessDate: activeDate, companyId };
        if (cr.id) {
          existingWhere.cashRegisterId = cr.id;
        } else {
          existingWhere.cashRegisterId = 0; // NULL kasaları 0 olarak tutuyoruz
        }

        // Satışları doğrudan businessDate üzerinden çek (shiftId bağımsız)
        const crFilter = cr.id ? `AND s.cashRegisterId = ${cr.id}` : 'AND (s.cashRegisterId IS NULL OR s.cashRegisterId = 0)';

        const tahsilatRes = await this.dataSource.query(`
          SELECT
            SUM(CASE WHEN paymentMethod IN ('KASA','CASH') THEN CAST(paidAmountCash AS DECIMAL(12,2)) ELSE 0 END) as nakit,
            SUM(CASE WHEN paymentMethod IN ('KREDI_KARTI','CREDIT_CARD','CC') THEN CAST(paidAmountCreditCard AS DECIMAL(12,2)) ELSE 0 END) as krediKarti,
            SUM(CASE WHEN paymentMethod IN ('BANKA','EFT','HAVALE') THEN CAST(totalAmount AS DECIMAL(12,2)) ELSE 0 END) as banka,
            SUM(CASE WHEN paymentMethod = 'CARI' THEN CAST(totalAmount AS DECIMAL(12,2)) ELSE 0 END) as cari,
            SUM(CASE WHEN paymentMethod = 'SPLIT' THEN CAST(paidAmountCash AS DECIMAL(12,2)) ELSE 0 END) as splitNakit,
            SUM(CASE WHEN paymentMethod = 'SPLIT' THEN CAST(paidAmountCreditCard AS DECIMAL(12,2)) ELSE 0 END) as splitKart,
            SUM(CAST(totalAmount AS DECIMAL(12,2))) as toplamTahsilat,
            COUNT(*) as adisyonSayisi,
            ISNULL(SUM(CAST(discountAmount AS DECIMAL(12,2))), 0) as toplamIndirim,
            ISNULL(SUM(CAST(serviceFee AS DECIMAL(12,2))), 0) as toplamServis,
            ISNULL(SUM(CAST(refundAmount AS DECIMAL(12,2))), 0) as toplamIade
          FROM sales s
          WHERE s.businessDate = @0 AND (s.companyId = @1 OR s.companyId IS NULL) AND s.status = 'COMPLETED' ${crFilter}
        `, [activeDate, companyId]);
        const t = tahsilatRes[0] || {};
        const currentNetSales = Number(t.toplamTahsilat || 0);

        totalCashAll += Number(t.nakit || 0) + Number(t.splitNakit || 0);
        totalCardAll += Number(t.krediKarti || 0) + Number(t.splitKart || 0);
        totalBankAll += Number(t.banka || 0);

        const iptalRes = await this.dataSource.query(`
          SELECT COUNT(*) as iptalAdedi, ISNULL(SUM(CAST(totalAmount AS DECIMAL(12,2))), 0) as iptalToplam
          FROM sales s WHERE s.businessDate = @0 AND (s.companyId = @1 OR s.companyId IS NULL) AND s.status = 'CANCELLED' ${crFilter}
        `, [activeDate, companyId]);
        const iptal = iptalRes[0] || {};

        const urunRes = await this.dataSource.query(`
          SELECT COUNT(*) as toplamUrun
          FROM sale_items si JOIN sales s ON s.id = si.saleId
          WHERE s.businessDate = @0 AND (s.companyId = @1 OR s.companyId IS NULL) AND s.status = 'COMPLETED' AND si.status = 'ACTIVE' ${crFilter}
        `, [activeDate, companyId]);

        let zReport = await this.zReportRepo.findOne({ where: existingWhere });
        
        if (!zReport) {
          const zCount = await this.zReportRepo.count({ where: { companyId } });
          zReport = this.zReportRepo.create({
            cashRegisterId: cr.id || 0,
            businessDate: activeDate,
            companyId,
            generatedByUserId: userId,
            zNumber: zCount + 1,
            totalCustomers: 0,
            complimentaryTotal: 0,
            mealCardCollection: 0,
            onlinePaymentCollection: 0,
            giftCardCollection: 0,
            otherCollection: 0,
          });
        }

        // Değerleri her zaman güncelle (özellikle boş rapor oluşmuşsa üzerine yazar)
        zReport.netSales = currentNetSales;
        zReport.cashCollection = Number(t.nakit || 0) + Number(t.splitNakit || 0);
        zReport.creditCardCollection = Number(t.krediKarti || 0) + Number(t.splitKart || 0);
        zReport.cariCollection = Number(t.cari || 0);
        zReport.totalCollection = currentNetSales;
        zReport.totalReceipts = Number(t.adisyonSayisi || 0);
        zReport.totalProductCount = Number(urunRes[0]?.toplamUrun || 0);
        zReport.discountTotal = Number(t.toplamIndirim || 0);
        zReport.refundTotal = Number(t.toplamIade || 0);
        zReport.cancelTotal = Number(iptal.iptalToplam || 0);
        zReport.serviceFeeTotal = Number(t.toplamServis || 0);
        zReport.taxBase = currentNetSales > 0 ? Math.round(currentNetSales / 1.1 * 100) / 100 : 0;
        zReport.taxTotal = currentNetSales > 0 ? Math.round((currentNetSales - currentNetSales / 1.1) * 100) / 100 : 0;
        zReport.taxBreakdown = JSON.stringify([{ oran: 10, matrah: zReport.taxBase, kdv: zReport.taxTotal }]);
        
        // Eksik NOT NULL alanlar
        zReport.openAccountPrevious = 0;
        zReport.openAccountNew = 0;
        zReport.openAccountClosed = 0;
        zReport.openAccountRemaining = 0;
        zReport.expectedTotal = 0;
        zReport.confirmedTotal = 0;
        zReport.totalOpeningCash = 0;
        zReport.totalClosingCash = 0;
        zReport.totalExpectedCash = 0;
        zReport.totalCashDifference = 0;
        zReport.totalIncome = currentNetSales;
        zReport.totalExpense = 0;

        const savedZ = await this.zReportRepo.save(zReport);
        this.logger.warn(`[EOD-DEBUG] activeDate=${activeDate}, cr.id=${cr.id}, crFilter=${crFilter}, currentNetSales=${currentNetSales}, adisyon=${t.adisyonSayisi}, nakit=${t.nakit}, tahsilatRes=${JSON.stringify(tahsilatRes[0])}, savedZ.id=${savedZ.id}, savedZ.netSales=${savedZ.netSales}`);
        if (!zReportId || currentNetSales > maxSales) {
          zReportId = savedZ.id;
          maxSales = currentNetSales;
        }
      } catch (err: any) {
        lastErrorMsg = `Loop error (${cr.id}): ${err.message}`;
        this.logger.error(`Z-Raporu oluşturma hatası (kasa ${cr.id}):`, err);
      }
    }

    // ── Hiçbir kasada Z-Raporu oluşturulamadıysa boş bir tane garantile ──
    if (!zReportId) {
      try {
        const existingZ = await this.zReportRepo.findOne({ where: { businessDate: activeDate, companyId } });
        if (existingZ) {
          zReportId = existingZ.id;
        } else {
          const zCount = await this.zReportRepo.count({ where: { companyId } });
          const emptyZ = this.zReportRepo.create({
            cashRegisterId: cashRegisters[0]?.id || 0,
            businessDate: activeDate, companyId, generatedByUserId: userId, zNumber: zCount + 1,
            netSales: 0, cashCollection: 0, creditCardCollection: 0, cariCollection: 0,
            mealCardCollection: 0, onlinePaymentCollection: 0, giftCardCollection: 0, otherCollection: 0,
            totalCollection: 0, totalReceipts: 0, totalCustomers: 0, totalProductCount: 0,
            discountTotal: 0, complimentaryTotal: 0, refundTotal: 0, cancelTotal: 0, serviceFeeTotal: 0,
            taxBase: 0, taxTotal: 0, taxBreakdown: JSON.stringify([{ oran: 10, matrah: 0, kdv: 0 }]),
            openAccountPrevious: 0, openAccountNew: 0, openAccountClosed: 0, openAccountRemaining: 0,
            expectedTotal: 0, confirmedTotal: 0, totalOpeningCash: 0, totalClosingCash: 0,
            totalExpectedCash: 0, totalCashDifference: 0, totalIncome: 0, totalExpense: 0,
          });
          const savedZ = await this.zReportRepo.save(emptyZ);
          zReportId = savedZ.id;
        }
      } catch (err: any) {
        lastErrorMsg += ` | Fallback error: ${err.message}`;
        this.logger.error('Garantili Z-Raporu oluşturma hatası:', err);
      }
    }

    // ── Program tarihini güncelle ──
    await this.parametersService.upsert('pos', 'active_business_date', nextDateStr, 'Aktif Program Tarihi', 'text', 'Mevcut çalışma günü tarihi');
    await this.parametersService.upsert('pos', 'last_end_of_day_at', now.toISOString(), 'Son Gün Sonu Zamanı', 'text', 'Son başarılı gün sonu tarih/saati');

    // ── Log yaz ──
    await this.writeLog({
      companyId,
      userId,
      actionType: 'END_OF_DAY',
      oldBusinessDate: activeDate,
      newBusinessDate: nextDateStr,
      note: note || `Gün sonu başarıyla tamamlandı.`,
      openTableCount,
      metadata: lastErrorMsg ? JSON.stringify({ error: lastErrorMsg }) : undefined,
    });

    // ── Audit log ──
    try {
      await this.dataSource.query(`
        INSERT INTO audit_logs (timestamp, userId, actionType, description, companyId)
        VALUES (GETDATE(), @0, 'END_OF_DAY', @1, @2)
      `, [userId, `Gün sonu alındı. ${activeDate} → ${nextDateStr}`, companyId]);
    } catch {}

    // ── Finansal Kayıtları Güncelle (Manuel Gün Sonu Entegrasyonu) ──
    try {
      // Find all foreign currency sales for this date
      const foreignSales = await this.dataSource.query(`
        SELECT
          paidCurrency,
          paymentMethod,
          SUM(CAST(paidCurrencyAmount AS DECIMAL(12,2))) as totalForeignAmount,
          SUM(CAST(totalAmount AS DECIMAL(12,2))) as totalTryAmount
        FROM sales
        WHERE businessDate = @0 AND (companyId = @1 OR companyId IS NULL) AND status = 'COMPLETED'
          AND paidCurrency IS NOT NULL AND paidCurrency NOT IN ('TRY', 'TL')
        GROUP BY paidCurrency, paymentMethod
      `, [activeDate, companyId]);

      let foreignCashTrySum = 0;
      let foreignCardTrySum = 0;
      let foreignBankTrySum = 0;

      for (const fs of foreignSales) {
        const currency = fs.paidCurrency;
        const method = fs.paymentMethod || 'KASA';
        const foreignAmount = Number(fs.totalForeignAmount || 0);
        const tryAmount = Number(fs.totalTryAmount || 0);
        const exchangeRate = foreignAmount > 0 ? (tryAmount / foreignAmount) : 1.0;

        if (method === 'KASA' || method === 'CASH') {
          foreignCashTrySum += tryAmount;
        } else if (method === 'KREDI_KARTI' || method === 'CREDIT_CARD' || method === 'CC') {
          foreignCardTrySum += tryAmount;
        } else if (method === 'BANKA' || method === 'EFT' || method === 'HAVALE') {
          foreignBankTrySum += tryAmount;
        }

        // Upsert foreign currency end of day
        await this.financeService.upsertEndOfDay({
          amount: tryAmount,
          foreignAmount: foreignAmount,
          exchangeRate: exchangeRate,
          currency: currency,
          description: `Gün Sonu ${currency} ${method === 'KREDI_KARTI' || method === 'CREDIT_CARD' ? 'Kredi Kartı' : (method === 'BANKA' || method === 'EFT' ? 'Banka' : 'Nakit')} Tahsilatı - ${activeDate}`,
          category: 'Gün Sonu',
          paymentMethod: (method === 'KREDI_KARTI' || method === 'CREDIT_CARD') ? 'KREDI_KARTI' : ((method === 'BANKA' || method === 'EFT') ? 'BANKA' : 'KASA'),
          userId,
          businessDate: activeDate,
        });
      }

      // Calculate TRY-only remaining totals
      const remainingCash = totalCashAll - foreignCashTrySum;
      const remainingCard = totalCardAll - foreignCardTrySum;
      const remainingBank = totalBankAll - foreignBankTrySum;

      if (remainingCash > 0) {
        await this.financeService.upsertEndOfDay({
          amount: remainingCash,
          description: `Gün Sonu Nakit Tahsilat (TL) - ${activeDate}`,
          category: 'Gün Sonu',
          paymentMethod: 'KASA',
          userId,
          businessDate: activeDate,
          currency: 'TRY',
          exchangeRate: 1.0,
          foreignAmount: 0.0,
        });
      }
      if (remainingCard > 0) {
        await this.financeService.upsertEndOfDay({
          amount: remainingCard,
          description: `Gün Sonu Kredi Kartı Tahsilat (TL) - ${activeDate}`,
          category: 'Gün Sonu',
          paymentMethod: 'KREDI_KARTI',
          userId,
          businessDate: activeDate,
          currency: 'TRY',
          exchangeRate: 1.0,
          foreignAmount: 0.0,
        });
      }
      if (remainingBank > 0) {
        await this.financeService.upsertEndOfDay({
          amount: remainingBank,
          description: `Gün Sonu Banka Tahsilat (TL) - ${activeDate}`,
          category: 'Gün Sonu',
          paymentMethod: 'BANKA',
          userId,
          businessDate: activeDate,
          currency: 'TRY',
          exchangeRate: 1.0,
          foreignAmount: 0.0,
        });
      }
    } catch (err) {
      this.logger.error('Finance upsert error during End of Day:', err);
    }

    // ── Satışları "Kapatıldı" Olarak İşaretle (businessDate bazlı) ──
    try {
      await this.dataSource.query(
        `UPDATE sales SET isEndOfDayClosed = 1 WHERE businessDate = @0 AND companyId = @1 AND status = 'COMPLETED'`,
        [activeDate, companyId]
      );
    } catch (err) {
      this.logger.error('Failed to mark sales as closed:', err);
    }

    return {
      success: true,
      message: `Gün sonu başarıyla tamamlandı. Yeni çalışma günü: ${nextDateStr}`,
      newBusinessDate: nextDateStr,
      zReportId: zReportId || undefined,
    };
  }

  // ─── 5) Kapalı gün devri ──────────────────────────────────────
  async rolloverClosedDay(
    userId: number,
    businessDate: string,
    isClosed: boolean,
    note: string,
    companyId: number = 1,
  ): Promise<{ success: boolean; message: string; nextDateToProcess?: string }> {
    const realDate = this.getRealDate();
    let activeDate = await this.getActiveBusinessDate(companyId);
    if (!activeDate || isNaN(new Date(activeDate).getTime())) {
      activeDate = realDate;
    }

    if (!businessDate || isNaN(new Date(businessDate).getTime())) {
      throw new BadRequestException('Geçersiz veya bozuk bir devir tarihi gönderildi.');
    }

    // Devredilecek tarih aktif program tarihinden bir gün sonrası olmalı
    const expectedNext = new Date(activeDate);
    expectedNext.setDate(expectedNext.getDate() + 1);
    const expectedNextStr = expectedNext.toISOString().split('T')[0];

    // Eğer istenen tarih zaten aktif iş günüyle aynı veya daha eskiyse atla, hataya düşme
    if (businessDate <= activeDate) {
      return { success: true, message: 'Bu tarih zaten devredilmiş veya kapanmış, atlanıyor.' };
    }

    if (businessDate !== expectedNextStr) {
      throw new BadRequestException(
        `Sıralı devir bekleniyor. Beklenen tarih: ${expectedNextStr}, gelen tarih: ${businessDate}`,
      );
    }

    // İleri tarih koruması
    if (businessDate > realDate) {
      throw new BadRequestException('Program tarihi gerçek tarihin ilerisine geçirilemez.');
    }

    // Kapalı gün kaydı oluştur
    try {
      const existing = await this.closedDayRepo.findOne({ where: { companyId, businessDate } });
      if (!existing) {
        const record = this.closedDayRepo.create({
          companyId,
          businessDate,
          isClosed,
          note: note || '',
          rolledOverByUserId: userId,
          rolledOverAt: new Date(),
        });
        await this.closedDayRepo.save(record);
      }
    } catch (e) {
      this.logger.error('closedDayRepo save error', e);
      throw new BadRequestException('Kapalı gün kaydı veritabanına eklenirken bir hata oluştu: ' + e.message);
    }

    // Program tarihini güncelle
    await this.parametersService.upsert('pos', 'active_business_date', businessDate, 'Aktif Program Tarihi', 'text', 'Mevcut çalışma günü tarihi');

    // Log
    await this.writeLog({
      companyId,
      userId,
      actionType: 'CLOSED_DAY_ROLLOVER',
      oldBusinessDate: activeDate,
      newBusinessDate: businessDate,
      note: `${isClosed ? 'Kapalı gün' : 'İşlem yapılmadan geçilen gün'} devredildi. Not: ${note || '-'}`,
    });

    // Sıradaki günü hesapla
    const nextDay = new Date(businessDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    const hasMoreDays = nextDayStr <= realDate && businessDate < realDate;

    return {
      success: true,
      message: `${businessDate} günü devredildi.`,
      nextDateToProcess: hasMoreDays ? nextDayStr : undefined,
    };
  }

  // ─── 6) Aynı tarihte devam et (yetkili) ──────────────────────
  async continueOnSameDate(
    userId: number,
    note: string,
    companyId: number = 1,
  ): Promise<{ success: boolean; message: string }> {
    if (!note || note.trim().length < 3) {
      throw new BadRequestException('Aynı tarihte devam etmek için zorunlu açıklama girilmelidir.');
    }

    const activeDate = await this.getActiveBusinessDate(companyId);

    // Log
    await this.writeLog({
      companyId,
      userId,
      actionType: 'SAME_DAY_CONTINUE',
      oldBusinessDate: activeDate,
      newBusinessDate: activeDate,
      note,
    });

    // Audit log
    try {
      await this.dataSource.query(`
        INSERT INTO audit_logs (timestamp, userId, actionType, description, companyId)
        VALUES (GETDATE(), @0, 'OVERRIDE', @1, @2)
      `, [userId, `Aynı program tarihinde (${activeDate}) devam edildi. Sebep: ${note}`, companyId]);
    } catch {}

    return {
      success: true,
      message: `${activeDate} tarihinde devam edildi. İşlem loglandı.`,
    };
  }

  // ─── 7) Bekleyen kapalı gün listesi ──────────────────────────
  async getClosedDayQueue(companyId: number = 1): Promise<string[]> {
    const activeDate = await this.getActiveBusinessDate(companyId);
    const realDate = this.getRealDate();
    return this.getMissingDays(activeDate, realDate);
  }

  // ─── 8) Teknik tarih düzeltme (üst yetkili) ──────────────────
  async technicalDateFix(
    userId: number,
    newDate: string,
    note: string,
    companyId: number = 1,
  ): Promise<{ success: boolean; message: string }> {
    const realDate = this.getRealDate();

    // İleri tarih koruması — kesin kural
    if (newDate > realDate) {
      throw new BadRequestException('Program tarihi gerçek tarihin ilerisine geçirilemez.');
    }

    if (!note || note.trim().length < 5) {
      throw new BadRequestException('Teknik tarih düzeltme için detaylı açıklama zorunludur.');
    }

    const activeDate = await this.getActiveBusinessDate(companyId);

    // Program tarihini güncelle
    await this.parametersService.upsert('pos', 'active_business_date', newDate, 'Aktif Program Tarihi', 'text', 'Mevcut çalışma günü tarihi');

    // Log — ağır log
    await this.writeLog({
      companyId,
      userId,
      actionType: 'TECHNICAL_DATE_FIX',
      oldBusinessDate: activeDate,
      newBusinessDate: newDate,
      note,
      metadata: JSON.stringify({
        realDate,
        reason: note,
        performedAt: new Date().toISOString(),
      }),
    });

    // Audit log
    try {
      await this.dataSource.query(`
        INSERT INTO audit_logs (timestamp, userId, actionType, description, companyId)
        VALUES (GETDATE(), @0, 'OVERRIDE', @1, @2)
      `, [userId, `TEKNİK TARİH DÜZELTMESİ: ${activeDate} → ${newDate}. Sebep: ${note}`, companyId]);
    } catch {}

    return {
      success: true,
      message: `Program tarihi ${activeDate} → ${newDate} olarak düzeltildi.`,
    };
  }

  // ─── Yardımcı: Tarih farkı hesapla ────────────────────────────
  private calculateDateDiff(dateA: string, dateB: string): number {
    const a = new Date(dateA);
    const b = new Date(dateB);
    const diffTime = b.getTime() - a.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // ─── Yardımcı: Log yaz ────────────────────────────────────────
  private async writeLog(data: {
    companyId: number;
    userId: number;
    actionType: string;
    oldBusinessDate?: string;
    newBusinessDate?: string;
    note?: string;
    openShiftCount?: number;
    openCashRegisterCount?: number;
    openTableCount?: number;
    approvedByUserId?: number;
    metadata?: string;
  }) {
    try {
      const log = this.logRepo.create({
        ...data,
        systemDate: new Date(),
      });
      await this.logRepo.save(log);
    } catch (err) {
      this.logger.error('Business day log yazma hatası:', err);
    }
  }
}
