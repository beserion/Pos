import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
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

    // ── Gün sonu işlemi: Z raporu oluştur (tüm kasalar için toplu) ──
    // Tüm kasaları bul
    const cashRegisters = await this.dataSource.query(
      `SELECT id FROM cash_registers WHERE companyId = @0 AND isActive = 1`,
      [companyId],
    );

    let totalCashAll = 0;
    let totalCardAll = 0;
    let totalBankAll = 0;
    let allShiftIdsForFinance: number[] = [];

    let zReportId: number | undefined;
    for (const cr of cashRegisters) {
      try {
        // Bu kasa + bu tarih için zaten Z raporu var mı?
        const existingZ = await this.zReportRepo.findOne({
          where: { cashRegisterId: cr.id, businessDate: activeDate, companyId },
        });
        if (existingZ) {
          zReportId = existingZ.id;
          continue; // Bu kasa için zaten alınmış
        }

        // Bu kasada bu tarihte vardiya var mı?
        const shifts = await this.shiftRepo.find({
          where: { cashRegisterId: cr.id, businessDate: activeDate, companyId },
        });
        if (shifts.length === 0) continue; // Bu kasada işlem yok

        // Açık vardiyalar varsa otomatik kapat (eğer mandatory değilse buraya geldiyse izin var)
        const openShifts = shifts.filter((s) => s.status === 'OPEN');
        if (openShifts.length > 0 && !autoCloseShifts) {
           throw new BadRequestException(`${cr.id} nolu kasada açık vardiya bulunmaktadır. Lütfen önce vardiyayı kapatın.`);
        }

        for (const openShift of openShifts) {
          // Beklenen nakit hesapla
          const expResult = await this.dataSource.query(
            `SELECT ISNULL(SUM(CAST(paidAmountCash AS DECIMAL(12,2))), 0) as totalCashIn
             FROM sales WHERE shiftId = @0 AND status = 'COMPLETED'`,
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

        // Z raporu oluştur
        const allShifts = await this.shiftRepo.find({
          where: { cashRegisterId: cr.id, businessDate: activeDate, companyId },
        });
        const shiftIds = allShifts.map((s) => s.id);
        if (shiftIds.length === 0) continue;

        const shiftIdList = shiftIds.join(',');

        const tahsilatRes = await this.dataSource.query(`
          SELECT
            SUM(CASE WHEN paymentMethod IN ('KASA','CASH') THEN CAST(paidAmountCash AS DECIMAL(12,2)) ELSE 0 END) as nakit,
            SUM(CASE WHEN paymentMethod IN ('KREDI_KARTI','CREDIT_CARD','CC') THEN CAST(paidAmountCreditCard AS DECIMAL(12,2)) ELSE 0 END) as krediKarti,
            SUM(CASE WHEN paymentMethod IN ('BANKA','EFT','HAVALE') THEN CAST(paidAmountBank AS DECIMAL(12,2)) ELSE 0 END) as banka,
            SUM(CASE WHEN paymentMethod = 'CARI' THEN CAST(totalAmount AS DECIMAL(12,2)) ELSE 0 END) as cari,
            SUM(CASE WHEN paymentMethod = 'SPLIT' THEN CAST(paidAmountCash AS DECIMAL(12,2)) ELSE 0 END) as splitNakit,
            SUM(CASE WHEN paymentMethod = 'SPLIT' THEN CAST(paidAmountCreditCard AS DECIMAL(12,2)) ELSE 0 END) as splitKart,
            SUM(CAST(totalAmount AS DECIMAL(12,2))) as toplamTahsilat,
            COUNT(*) as adisyonSayisi,
            SUM(CAST(discountAmount AS DECIMAL(12,2))) as toplamIndirim,
            ISNULL(SUM(CAST(serviceFee AS DECIMAL(12,2))), 0) as toplamServis,
            ISNULL(SUM(CAST(refundAmount AS DECIMAL(12,2))), 0) as toplamIade
          FROM sales
          WHERE shiftId IN (${shiftIdList}) AND status = 'COMPLETED'
        `);
        const t = tahsilatRes[0] || {};
        totalCashAll += Number(t.nakit || 0) + Number(t.splitNakit || 0);
        totalCardAll += Number(t.krediKarti || 0) + Number(t.splitKart || 0);
        totalBankAll += Number(t.banka || 0);
        allShiftIdsForFinance.push(...shiftIds);

        const iptalRes = await this.dataSource.query(`
          SELECT COUNT(*) as iptalAdedi, ISNULL(SUM(CAST(totalAmount AS DECIMAL(12,2))), 0) as iptalToplam
          FROM sales WHERE shiftId IN (${shiftIdList}) AND status = 'CANCELLED'
        `);
        const iptal = iptalRes[0] || {};

        const urunRes = await this.dataSource.query(`
          SELECT COUNT(*) as toplamUrun
          FROM sale_items si JOIN sales s ON s.id = si.saleId
          WHERE s.shiftId IN (${shiftIdList}) AND s.status = 'COMPLETED' AND si.status = 'ACTIVE'
        `);

        const netSales = Number(t.toplamTahsilat || 0);
        let totalOpeningCash = 0, totalClosingCash = 0, totalExpectedCash = 0, totalCashDifference = 0;
        for (const shift of allShifts) {
          totalOpeningCash += Number(shift.openingCash || 0);
          totalClosingCash += Number(shift.closingCash || 0);
          totalExpectedCash += Number(shift.expectedCash || 0);
          totalCashDifference += Number(shift.cashDifference || 0);
        }

        const zCount = await this.zReportRepo.count({ where: { cashRegisterId: cr.id, companyId } });

        const zReport = this.zReportRepo.create({
          cashRegisterId: cr.id,
          businessDate: activeDate,
          companyId,
          generatedByUserId: userId,
          zNumber: zCount + 1,
          openedAt: allShifts.reduce((min, s) => (!min || s.openedAt < min ? s.openedAt : min), null as any),
          closedAt: allShifts.reduce((max, s) => (!max || (s.closedAt && s.closedAt > max) ? s.closedAt : max), null as any),
          netSales,
          cashCollection: Number(t.nakit || 0) + Number(t.splitNakit || 0),
          creditCardCollection: Number(t.krediKarti || 0) + Number(t.splitKart || 0),
          cariCollection: Number(t.cari || 0),
          mealCardCollection: 0,
          onlinePaymentCollection: 0,
          giftCardCollection: 0,
          otherCollection: 0,
          totalCollection: netSales,
          totalReceipts: Number(t.adisyonSayisi || 0),
          totalCustomers: 0,
          totalProductCount: Number(urunRes[0]?.toplamUrun || 0),
          discountTotal: Number(t.toplamIndirim || 0),
          complimentaryTotal: 0,
          refundTotal: Number(t.toplamIade || 0),
          cancelTotal: Number(iptal.iptalToplam || 0),
          serviceFeeTotal: Number(t.toplamServis || 0),
          taxBase: Math.round(netSales / 1.1 * 100) / 100,
          taxTotal: Math.round((netSales - netSales / 1.1) * 100) / 100,
          taxBreakdown: JSON.stringify([{
            oran: 10,
            matrah: Math.round(netSales / 1.1 * 100) / 100,
            kdv: Math.round((netSales - netSales / 1.1) * 100) / 100,
          }]),
          openAccountPrevious: 0,
          openAccountNew: 0,
          openAccountClosed: 0,
          openAccountRemaining: 0,
          expectedTotal: totalExpectedCash,
          confirmedTotal: totalClosingCash,
          totalOpeningCash,
          totalClosingCash,
          totalExpectedCash,
          totalCashDifference,
          totalIncome: netSales,
          totalExpense: 0,
        });

        const savedZ = await this.zReportRepo.save(zReport);
        zReportId = savedZ.id;

        // ── Otomatik Yazdırma (Ön Yüzden Manuel Tetikleniyor) ──
        /*
        try {
          const [crInfo, userInfo] = await Promise.all([
            this.dataSource.query(`SELECT name FROM cash_registers WHERE id = @0`, [cr.id]),
            this.dataSource.query(`SELECT firstName, lastName FROM users WHERE id = @0`, [userId])
          ]);

          const printData = {
            ...savedZ,
            cashRegisterName: crInfo[0]?.name || `Kasa #${cr.id}`,
            userName: userInfo[0] ? `${userInfo[0].firstName} ${userInfo[0].lastName}`.trim() : 'Bilinmeyen Kullanıcı'
          };

          // JSON alanları objeye çevir (PrintersService dizi/obje bekliyor)
          try {
            if (printData.taxBreakdown && typeof printData.taxBreakdown === 'string') printData.taxBreakdown = JSON.parse(printData.taxBreakdown);
            if (printData.categoryTotals && typeof printData.categoryTotals === 'string') printData.categoryTotals = JSON.parse(printData.categoryTotals);
            if (printData.waiterSales && typeof printData.waiterSales === 'string') printData.waiterSales = JSON.parse(printData.waiterSales);
            if (printData.paymentTotals && typeof printData.paymentTotals === 'string') printData.paymentTotals = JSON.parse(printData.paymentTotals);
          } catch (e) {}

          await this.printersService.printZReport(printData);
        } catch (printErr) {
          this.logger.error(`Z-Raporu otomatik yazdırma hatası (Kasa #${cr.id}):`, printErr);
        }
        */
      } catch (err) {
        this.logger.error(`Z-Raporu oluşturma hatası (kasa ${cr.id}):`, err);
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
      if (totalCashAll > 0) {
        await this.financeService.upsertEndOfDay({
          amount: totalCashAll,
          description: `Gün Sonu Nakit Tahsilat - ${activeDate}`,
          category: 'Gün Sonu',
          paymentMethod: 'KASA',
          userId,
          businessDate: activeDate,
        });
      }
      if (totalCardAll > 0) {
        await this.financeService.upsertEndOfDay({
          amount: totalCardAll,
          description: `Gün Sonu Kredi Kartı Tahsilat - ${activeDate}`,
          category: 'Gün Sonu',
          paymentMethod: 'KREDI_KARTI',
          userId,
          businessDate: activeDate,
        });
      }
      if (totalBankAll > 0) {
        await this.financeService.upsertEndOfDay({
          amount: totalBankAll,
          description: `Gün Sonu Banka Tahsilat - ${activeDate}`,
          category: 'Gün Sonu',
          paymentMethod: 'BANKA',
          userId,
          businessDate: activeDate,
        });
      }
    } catch (err) {
      this.logger.error('Finance upsert error during End of Day:', err);
    }

    // ── Satışları "Kapatıldı" Olarak İşaretle ──
    if (allShiftIdsForFinance.length > 0) {
      try {
        await this.saleRepo.update(
          { shiftId: In(allShiftIdsForFinance), status: 'COMPLETED' },
          { isEndOfDayClosed: true }
        );
      } catch (err) {
        this.logger.error('Failed to mark sales as closed:', err);
      }
    }

    return {
      success: true,
      message: `Gün sonu başarıyla tamamlandı. Yeni çalışma günü: ${nextDateStr}`,
      newBusinessDate: nextDateStr,
      zReportId,
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
