import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Printer } from './printer.entity';
import { CashRegister } from '../cash-registers/cash-register.entity';
import { OrderRoutingService } from '../order-routing/order-routing.service';
import { ParametersService } from '../parameters/parameters.service';
import { OutputProfile } from '../output-profiles/output-profile.entity';
import { Table } from '../tables/table.entity';
import { Zone } from '../zones/zone.entity';
import { Sale } from '../sales/sale.entity';

/** Türkçe özel karakterleri ASCII karşılıklarına çevirir (yazıcı uyumluluğu için) */
function trASCII(text: string): string {
  if (!text) return '';
  return text
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
}

/** İşlem tipi etiketini döndürür (SALE dışındaki tipler için) */
function getTransactionLabel(type: string): string {
  switch (type) {
    case 'COMPLIMENTARY': return 'IKRAM';
    case 'FREE': return 'BEDELSIZ';
    case 'PROMOTION': return 'PROMOSYON';
    case 'STAFF': return 'PERSONEL';
    case 'TICKET': return 'FIYET';
    default: return '';
  }
}

@Injectable()
export class PrintersService {
  constructor(
    @InjectRepository(Printer)
    private readonly printerRepository: Repository<Printer>,
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepository: Repository<CashRegister>,
    @Inject(forwardRef(() => OrderRoutingService))
    private readonly orderRoutingService: OrderRoutingService,
    private readonly parametersService: ParametersService,
    @InjectRepository(OutputProfile)
    private readonly profileRepository: Repository<OutputProfile>,
    private readonly dataSource: DataSource,
  ) { }

  async findAll(): Promise<Printer[]> {
    return this.printerRepository.find();
  }

  async findOne(id: number): Promise<Printer> {
    const printer = await this.printerRepository.findOne({ where: { id } });
    if (!printer) {
      throw new NotFoundException(`Printer #${id} not found`);
    }
    return printer;
  }

  async create(createData: Partial<Printer>): Promise<Printer> {
    const printer = this.printerRepository.create(createData);
    return this.printerRepository.save(printer);
  }

  async update(id: number, updateData: Partial<Printer>): Promise<Printer> {
    await this.findOne(id);
    await this.printerRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const printer = await this.findOne(id);
    await this.printerRepository.remove(printer);
  }

  async printReceipt(
    data: any,
  ): Promise<{ success: boolean; message: string }> {
    let printer: Printer | null = null;
    let resolvedProfile: OutputProfile | undefined = undefined;

    if (data.cashRegisterId) {
      this.logger.log(`Kasa ID ${data.cashRegisterId} için profil/yazıcı aranıyor...`);
      const cashRegister = await this.cashRegisterRepository.findOne({
        where: { id: data.cashRegisterId },
        relations: ['receiptPrinter', 'receiptProfile', 'receiptProfile.mainPrinter', 'receiptProfile.infoPrinter'],
      });
      
      if (cashRegister) {
        if (cashRegister.receiptProfile) {
          // Profili veritabanından TÜM alanlarıyla (boolean dahil) yeniden çek
          resolvedProfile = await this.profileRepository.findOne({ 
            where: { id: cashRegister.receiptProfile.id },
            relations: ['mainPrinter', 'infoPrinter'] 
          }) || cashRegister.receiptProfile;

          this.logger.log(`Kasa Çıktı Profili bulundu: ${resolvedProfile.name}, showExchangeRates: ${resolvedProfile.showExchangeRates}`);
          
          // Profil içinde yazıcı tanımlıysa doğrudan onları kullan
          const targetPrinters = [];
          if (resolvedProfile.mainPrinter) targetPrinters.push({ printer: resolvedProfile.mainPrinter, type: 'MAIN', copyCount: resolvedProfile.copyCount || 1 });
          if (resolvedProfile.infoPrinter) targetPrinters.push({ printer: resolvedProfile.infoPrinter, type: 'INFO', copyCount: 1 });
          
          if (targetPrinters.length > 0) {
            return this.printToMultiplePrinters(targetPrinters, data, resolvedProfile);
          }
          // Profil var ama içinde yazıcı atanmamış — kasanın receiptPrinter'ını kullan ama profil ayarlarını koru
          this.logger.log(`Profil içinde yazıcı tanımlı değil, kasanın receiptPrinter'ı deneniyor (profil ayarları korunacak).`);
        }
        
        if (cashRegister.receiptPrinter) {
          printer = cashRegister.receiptPrinter;
          this.logger.log(`Kasa yazıcısı bulundu: ${printer.name} (${printer.ipAddress})`);
        }
      }
    }

    if (!printer) {
      this.logger.log(`Varsayılan 'kasa' yazıcısı aranıyor...`);
      printer = (await this.printerRepository
        .createQueryBuilder('printer')
        .where('LOWER(printer.name) = :name', { name: 'kasa' })
        .andWhere('printer.isActive = :isActive', { isActive: true })
        .getOne()) as Printer | null;
      
      if (printer) {
        this.logger.log(`Varsayılan 'kasa' yazıcısı bulundu: ${printer.ipAddress}`);
      }
    }

    // FINAL FALLBACK: If still no printer, use the first active printer in the system
    if (!printer) {
      this.logger.warn('Kasa yazıcısı ve varsayılan "kasa" yazıcısı bulunamadı. İlk aktif yazıcı deneniyor...');
      printer = await this.printerRepository.findOne({ where: { isActive: true } });
      if (printer) {
        this.logger.log(`Yedek yazıcı olarak "${printer.name}" kullanılacak.`);
      }
    }

    if (!printer || !printer.ipAddress) {
      this.logger.error('Yazdırma başarısız: Hiçbir aktif yazıcı bulunamadı.');
      return {
        success: false,
        message: 'Fiş yazdırılamadı: Geçerli bir yazıcı bulunamadı.',
      };
    }

    // Profil hâlâ bulunamadıysa (cashRegisterId gelmedi veya kasaya profil atanmadı),
    // veritabanındaki ilk STANDARD profili bul ve ayarlarını uygula
    if (!resolvedProfile) {
      resolvedProfile = await this.profileRepository.findOne({
        where: { profileType: 'STANDARD' },
        order: { id: 'ASC' },
      }) ?? undefined;
      if (resolvedProfile) {
        this.logger.log(`Varsayılan STANDARD profil uygulandı: ${resolvedProfile.name}, showExchangeRates: ${resolvedProfile.showExchangeRates}`);
      } else {
        this.logger.warn('Hiçbir STANDARD profil bulunamadı. Profil ayarları uygulanamıyor.');
      }
    }

    // resolvedProfile varsa profil ayarlarını (kur, logo vb.) yazıcıya taşı
    return this.printToMultiplePrinters([{ printer, type: 'MAIN', copyCount: resolvedProfile?.copyCount || 1 }], data, resolvedProfile);
  }

  private async printToMultiplePrinters(
    targets: { printer: Printer; type: string; copyCount: number }[],
    data: any,
    profile?: OutputProfile
  ): Promise<{ success: boolean; message: string }> {
    let zoneName = '';
    let tempName = data.tempName || '';
    let subCheckLabel = data.subCheckLabel || '';
    let waiterName = data.waiterName || '';

    if (data.id) {
      try {
        const sale = await this.dataSource.getRepository(Sale).findOne({
          where: { id: Number(data.id) },
          relations: ['table', 'table.zone', 'waiter'],
        });
        if (sale) {
          if (sale.table) {
            if (!tempName && sale.table.tempName) {
              tempName = sale.table.tempName;
            }
            if (sale.table.zone) {
              zoneName = sale.table.zone.name;
            }
          }
          if (!subCheckLabel && sale.subCheckLabel) {
            subCheckLabel = sale.subCheckLabel;
          }
          if (!waiterName && sale.waiter) {
            waiterName = `${sale.waiter.firstName || ''} ${sale.waiter.lastName || ''}`.trim();
          }
        }
      } catch (err) {
        this.logger.error(`Error resolving sale/table details in printToMultiplePrinters: ${err.message}`);
      }
    }

    if (!zoneName && data.zoneId) {
      try {
        const zone = await this.dataSource.getRepository(Zone).findOne({
          where: { id: Number(data.zoneId) }
        });
        if (zone) zoneName = zone.name;
      } catch (err) {}
    }

    const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } =
      await import('node-thermal-printer');

    let successCount = 0;
    let lastError = '';

    for (const target of targets) {
      const printer = target.printer;
      for (let i = 0; i < target.copyCount; i++) {
        try {
          let printerInterface = printer.ipAddress;
          
          // Interface resolution logic
          if (printerInterface.includes('.') && !printerInterface.startsWith('tcp://') && !printerInterface.includes('//') && !printerInterface.includes('\\\\')) {
            printerInterface = `tcp://${printerInterface}`;
          }
          if (process.platform === 'win32' && !printerInterface.startsWith('tcp://') && !printerInterface.includes('\\\\') && !printerInterface.includes('/') && !printerInterface.startsWith('printer:')) {
            printerInterface = `printer:${printerInterface}`;
          }

          const thermalPrinter = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            interface: printerInterface,
            characterSet: CharacterSet.WPC1254_TURKISH,
            removeSpecialCharacters: false,
            lineCharacter: '=',
            breakLine: BreakLine.WORD,
            options: { timeout: 5000 },
          });

          if (printerInterface.startsWith('tcp://')) {
            const isConnected = await thermalPrinter.isPrinterConnected();
            if (!isConnected) throw new Error(`Yazıcıya bağlanılamadı: ${printerInterface}`);
          }

          // --- GÖVDE OLUŞTURMA ---
          thermalPrinter.alignCenter();
          thermalPrinter.bold(true);
          
          // Profil bazlı ayarlar
          const tw = profile?.textSize === 'XLARGE' ? 2 : profile?.textSize === 'LARGE' ? 1 : 0;
          const th = tw;
          thermalPrinter.setTextSize(tw, th);
          
          if (profile?.showLogo) {
            thermalPrinter.println('*** ' + (trASCII(data.companyName) || 'POSNETX') + ' ***');
          }

          if (profile?.showTitle !== false) {
             thermalPrinter.println(trASCII(profile?.customTitle || 'FIS / ADISYON'));
          }
          
          thermalPrinter.setTextNormal();
          thermalPrinter.bold(false);
          thermalPrinter.println('Tesekkur Ederiz');
          thermalPrinter.drawLine();

          thermalPrinter.alignLeft();
          const date = new Date(data.date || new Date()).toLocaleString('tr-TR');
          
          if (data.tableName || zoneName) {
            const headerTw = Math.max(0, tw === 0 ? 1 : tw);
            const headerTh = Math.max(0, th === 0 ? 1 : th);
            thermalPrinter.setTextSize(headerTw, headerTh);

            // Bölüm adı kalın punto
            if (zoneName) {
              thermalPrinter.bold(true);
              thermalPrinter.println(trASCII(zoneName.toUpperCase()));
            }

            // Masa adı + geçici masa adı + alt adisyon
            let tableDisplayName = data.tableName || '';
            if (tempName) {
              tableDisplayName += ` (${tempName.toUpperCase()})`;
            }
            if (subCheckLabel) {
              tableDisplayName += ` - ${subCheckLabel}`;
            }

            thermalPrinter.bold(true);
            thermalPrinter.println(trASCII(tableDisplayName));

            thermalPrinter.setTextSize(tw, th);
            thermalPrinter.bold(false);
            thermalPrinter.drawLine();
            thermalPrinter.alignLeft();
          }

          // Program Tarihi (businessDate) + Saat gösterimi
          let displayDate = '';
          if (data.businessDate) {
            displayDate = new Date(data.businessDate).toLocaleDateString('tr-TR');
          } else {
            displayDate = date.includes(' ') ? date.split(' ')[0] : new Date().toLocaleDateString('tr-TR');
          }
          const timeOnly = date.includes(' ') ? date.split(' ')[1].substring(0, 5) : date;
          thermalPrinter.leftRight(`Tarih: ${displayDate} ${timeOnly}`, `No: ${trASCII(String(data.receiptNumber || data.id || '000000'))}`);
          
          if (waiterName) {
            thermalPrinter.println(`Hesap Isteyen: ${trASCII(waiterName)}`);
          } else if (profile?.showWaiter !== false && data.cashierName) {
            thermalPrinter.println(`Kasiyer: ${trASCII(data.cashierName)}`);
          }
          thermalPrinter.drawLine();

          thermalPrinter.leftRight('Urun', 'Tutar');
          thermalPrinter.drawLine();

          const activeItems = data.items.filter((i: any) => !i.status || i.status === 'ACTIVE');
          const inactiveItems = data.items.filter((i: any) => i.status && i.status !== 'ACTIVE');

          for (const item of activeItems) {
            let portionStr = '';
            if (item.saleType === 'HALF') portionStr = '(YARIM) ';
            else if (item.saleType === 'DOUBLE') portionStr = '(DUBLE) ';
            
            const itemName = item.name || item.product?.name || 'Urun';
            const nameStr = `${item.quantity}x ${portionStr}${trASCII(itemName)}`;
            const txLabel = getTransactionLabel(item.transactionType);
            const totalStr = txLabel && Number(item.total) === 0
              ? `[${txLabel}]`
              : txLabel
                ? `${Number(item.total).toFixed(2)} TL [${txLabel}]`
                : `${Number(item.total).toFixed(2)} TL`;
            thermalPrinter.leftRight(nameStr, totalStr);

            if (Number(item.discountAmount || 0) > 0) {
              thermalPrinter.println(`  Indirim: -${Number(item.discountAmount).toFixed(2)} TL`);
            }

            if (profile?.showPortion !== false) {
              if (item.subItems && item.subItems.length > 0) {
                for (const sub of item.subItems) {
                  const subName = trASCII(sub.product?.name || sub.name || `Urun #${sub.productId}`);
                  const subQty = sub.quantity && sub.quantity > 1 ? `${sub.quantity}x ` : '';
                  thermalPrinter.println(`  + ${subQty}${subName}`);
                }
              }
              if (item.note) thermalPrinter.println(`  Not: ${trASCII(item.note)}`);
            }
          }

          if (inactiveItems.length > 0) {
            thermalPrinter.drawLine();
            thermalPrinter.alignCenter();
            thermalPrinter.bold(true);
            thermalPrinter.println('!!! IPTAL / IADE EDILENLER !!!');
            thermalPrinter.bold(false);
            thermalPrinter.alignLeft();
            thermalPrinter.drawLine();

            for (const item of inactiveItems) {
              let portionStr = '';
              if (item.saleType === 'HALF') portionStr = '(YARIM) ';
              else if (item.saleType === 'DOUBLE') portionStr = '(DUBLE) ';
              
              const statusLabel = item.status === 'REFUNDED' ? 'IADE' : 'IPTAL';
              const itemName = item.name || item.product?.name || 'Urun';
              const nameStr = `${item.quantity}x ${portionStr}${trASCII(itemName)} [${statusLabel}]`;
              thermalPrinter.println(nameStr);
              const reason = item.refundReason || item.cancelReason || item.note;
              if (reason) thermalPrinter.println(`  Sebep: ${trASCII(reason)}`);
            }
          }

          thermalPrinter.drawLine();

          // İndirim varsa ARA TOPLAM ve İNDİRİM satırlarını göster
          if (Number(data.discountAmount || 0) > 0) {
            const subTotalBeforeDiscount = Number(data.totalAmount) + Number(data.discountAmount);
            thermalPrinter.leftRight('ARA TOPLAM', `${subTotalBeforeDiscount.toFixed(2)} TL`);
            thermalPrinter.leftRight('INDIRIM', `-${Number(data.discountAmount).toFixed(2)} TL`);
            thermalPrinter.drawLine();
          }

          // TOPLAM — profil boyutundan 1 kademe büyük
          const totalTw = Math.min((tw || 0) + 1, 2);
          const totalTh = Math.min((th || 0) + 1, 2);
          thermalPrinter.setTextSize(totalTw, totalTh);
          thermalPrinter.bold(true);
          thermalPrinter.leftRight('TOPLAM', `${Number(data.totalAmount).toFixed(2)} TL`);
          thermalPrinter.setTextNormal();
          thermalPrinter.bold(false);
          


          // Döviz Kurları (Profilde açıksa)
          this.logger.log(`[printReceipt] showExchangeRates: ${profile?.showExchangeRates}, totalAmount: ${data.totalAmount}, profileId: ${profile?.id}`);
          if (profile?.showExchangeRates) {
            try {
              const [eurStr, usdStr, gbpStr] = await Promise.all([
                this.parametersService.getValue('pos', 'eur_rate'),
                this.parametersService.getValue('pos', 'usd_rate'),
                this.parametersService.getValue('pos', 'gbp_rate')
              ]);
              this.logger.log(`[printReceipt] Kur değerleri: EUR=${eurStr}, USD=${usdStr}, GBP=${gbpStr}`);
              const eurRate = Number(eurStr) || 37.50;
              const usdRate = Number(usdStr) || 35.20;
              const gbpRate = Number(gbpStr) || 44.10;
              
              const totalAmount = Number(data.totalAmount || 0);
              if (totalAmount > 0) {
                thermalPrinter.drawLine();
                thermalPrinter.leftRight('EURO  (EUR)', `${(totalAmount / eurRate).toFixed(2)} EUR`);
                thermalPrinter.leftRight('DOLAR (USD)', `${(totalAmount / usdRate).toFixed(2)} USD`);
                thermalPrinter.leftRight('STERLIN (GBP)', `${(totalAmount / gbpRate).toFixed(2)} GBP`);
              } else {
                this.logger.warn('[printReceipt] totalAmount sıfır, kur bilgileri yazdırılmadı.');
              }
            } catch (e) {
              this.logger.error('Döviz kurları yazdırılırken hata:', e.message);
            }
          }

          thermalPrinter.drawLine();
          thermalPrinter.alignCenter();
          thermalPrinter.println('Mali Degeri Yoktur - Bilgi Fisidir');
          thermalPrinter.cut();
          
          await thermalPrinter.execute();
          successCount++;
        } catch (err: any) {
          this.logger.error(`Yazıcı Hatası (${printer.name}): ${err.message}`);
          lastError = err.message;
        }
      }
    }

    if (successCount > 0) {
      return { success: true, message: `${successCount} yazıcıdan çıktı alındı.` };
    } else {
      return { success: false, message: `Yazdırma başarısız: ${lastError}` };
    }
  }

  private readonly logger = new Logger(PrintersService.name);

  async printKitchen(
    data: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const itemsToPrint = data.items || [];
      console.log('[printKitchen] Gelen data:', JSON.stringify({ tableName: data.tableName, waiterName: data.waiterName, orderType: data.orderType, itemCount: itemsToPrint.length }));
      if (itemsToPrint.length === 0) {
        return { success: false, message: 'Yazdırılacak ürün bulunamadı.' };
      }

      let zoneName = '';
      let tempName = data.tempName || '';
      let subCheckLabel = data.subCheckLabel || '';

      let saleId: number | null = null;
      if (data.receiptNumber && typeof data.receiptNumber === 'string') {
        const match = data.receiptNumber.match(/\d+/);
        if (match) {
          saleId = parseInt(match[0]);
        }
      } else if (data.id) {
        saleId = Number(data.id);
      }

      if (saleId) {
        try {
          const sale = await this.dataSource.getRepository(Sale).findOne({
            where: { id: saleId },
            relations: ['table', 'table.zone'],
          });
          if (sale?.table) {
            if (!tempName && sale.table.tempName) {
              tempName = sale.table.tempName;
            }
            if (sale.table.zone) {
              zoneName = sale.table.zone.name;
            }
          }
          if (!subCheckLabel && sale?.subCheckLabel) {
            subCheckLabel = sale.subCheckLabel;
          }
        } catch (err) {
          this.logger.error(`Error resolving sale/table details in printKitchen: ${err.message}`);
        }
      }

      if (!zoneName && data.zoneId) {
        try {
          const zone = await this.dataSource.getRepository(Zone).findOne({ where: { id: Number(data.zoneId) } });
          if (zone) {
            zoneName = zone.name;
          }
        } catch (err) {}
      }

      // Yeni Nesil Yönlendirme Algoritması Devreye Giriyor
      const routedGroups = await this.orderRoutingService.routeOrderItems(itemsToPrint, data.zoneId);
      
      const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } =
        await import('node-thermal-printer');

      let printCount = 0;

      for (const group of routedGroups) {
        const profile = group.profile;
        if (!profile) continue;

        const targetPrinters = [];
        
        if (profile.mainPrinter) targetPrinters.push({ printer: profile.mainPrinter, type: 'MAIN', profileName: profile.name });
        if (profile.infoPrinter) targetPrinters.push({ printer: profile.infoPrinter, type: 'INFO', profileName: profile.name });

        for (const target of targetPrinters) {
          const printer = target.printer;
          if (!printer) {
            this.logger.warn(`[printKitchen] Target "${target.type}" için yazıcı nesnesi YÜKLENEMEDİ (Profil: ${target.profileName})`);
            continue;
          }
          if (!printer.isActive) {
            this.logger.warn(`[printKitchen] Yazıcı "${printer.name}" PASİF durumda, atlanıyor.`);
            continue;
          }
          if (!printer.ipAddress) {
            this.logger.warn(`[printKitchen] Yazıcı "${printer.name}" için IP/Adres eksik, atlanıyor.`);
            continue;
          }
          
          const copyCount = target.type === 'MAIN' ? (profile?.copyCount || 1) : 1;
          
          for (let c = 0; c < copyCount; c++) {
            try {
              let printerInterface = printer.ipAddress;
              // 1. IP Adresi kontrolü
              if (
                printerInterface.includes('.') &&
                !printerInterface.startsWith('tcp://') &&
                !printerInterface.includes('//') &&
                !printerInterface.includes('\\\\')
              ) {
                printerInterface = `tcp://${printerInterface}`;
              }

              // 2. Windows USB/Local Yazıcı kontrolü
              if (
                process.platform === 'win32' &&
                !printerInterface.startsWith('tcp://') &&
                !printerInterface.includes('\\\\') &&
                !printerInterface.includes('/') &&
                !printerInterface.startsWith('printer:')
              ) {
                this.logger.log(`Windows USB Yazıcı formatı düzeltiliyor: ${printerInterface} -> printer:${printerInterface}`);
                printerInterface = `printer:${printerInterface}`;
              }

              const thermalPrinter = new ThermalPrinter({
                type: PrinterTypes.EPSON,
                interface: printerInterface,
                characterSet: CharacterSet.WPC1254_TURKISH,
                removeSpecialCharacters: false,
                lineCharacter: '=',
                breakLine: BreakLine.WORD,
                options: { timeout: 5000 },
              });

              let isConnected = true;
              if (printerInterface.startsWith('tcp://')) {
                isConnected = await thermalPrinter.isPrinterConnected();
              }

              if (isConnected) {
                // === BAŞLIK ===
                thermalPrinter.alignCenter();
                thermalPrinter.bold(true);
                
                // Font boyutu ayarı (DÜZELTİLDİ: 0: Normal, 1: Large, 2: XL)
                let tw = 0, th = 0;
                if (profile.textSize === 'LARGE') { tw = 1; th = 1; }
                else if (profile.textSize === 'XLARGE') { tw = 2; th = 2; }
                
                if (profile.showLogo) {
                  thermalPrinter.println('*** ' + (trASCII(data.companyName) || 'POSNETX') + ' ***');
                }

                if (profile.showTitle !== false) {
                  thermalPrinter.setTextSize(tw, th);
                  let title = trASCII(profile.customTitle || data.orderType || 'MUTFAK SIPARISI');
                  if (target.type === 'INFO') title = 'BILGI FISI';
                  if (profile.infoOnly && profile.showPrice) title = 'ADISYON';
                  
                  // İade/İptal durumu kontrolü
                  const allRefunded = group.items.every((i: any) => i.status === 'REFUNDED');
                  const allCancelled = group.items.every((i: any) => i.status === 'CANCELLED');
                  if (allRefunded) title = '!!! IADE FISI !!!';
                  else if (allCancelled) title = '!!! IPTAL FISI !!!';

                  thermalPrinter.println(title);
                  thermalPrinter.bold(false);
                  thermalPrinter.drawLine();
                }

                // === BİLGİ SATIRI ===
                thermalPrinter.alignLeft();
                const infoTw = Math.max(0, tw - 1);
                const infoTh = Math.max(0, th - 1);
                thermalPrinter.setTextSize(infoTw, infoTh);
                const date = new Date(data.date || new Date()).toLocaleString('tr-TR');

                // Masa adı — büyük ve belirgin
                if ((data.tableName || zoneName) && profile.showTable !== false) {
                  thermalPrinter.alignCenter();
                  const tableTw = Math.max(0, tw === 0 ? 1 : tw);
                  const tableTh = Math.max(0, th === 0 ? 1 : th);
                  thermalPrinter.setTextSize(tableTw, tableTh);

                  // Bölüm adı kalın punto
                  if (zoneName) {
                    thermalPrinter.bold(true);
                    thermalPrinter.println(trASCII(zoneName.toUpperCase()));
                  }

                  // Masa adı + geçici masa adı + alt adisyon
                  let tableDisplayName = data.tableName || '';
                  if (tempName) {
                    tableDisplayName += ` (${tempName.toUpperCase()})`;
                  }
                  if (subCheckLabel) {
                    tableDisplayName += ` - ${subCheckLabel}`;
                  }

                  thermalPrinter.bold(true);
                  thermalPrinter.println(trASCII(tableDisplayName));

                  const resetTw = Math.max(0, tw - 1);
                  const resetTh = Math.max(0, th - 1);
                  thermalPrinter.setTextSize(resetTw, resetTh);
                  thermalPrinter.bold(false);
                  thermalPrinter.drawLine();
                  thermalPrinter.alignLeft();
                }

                // Program Tarihi (businessDate) + Saat gösterimi
                let kitchenDisplayDate = '';
                if (data.businessDate) {
                  kitchenDisplayDate = new Date(data.businessDate).toLocaleDateString('tr-TR');
                } else {
                  kitchenDisplayDate = date.includes(' ') ? date.split(' ')[0] : new Date().toLocaleDateString('tr-TR');
                }
                const timeOnly = date.includes(' ') ? date.split(' ')[1].substring(0, 5) : date;
                 thermalPrinter.leftRight(`Tarih: ${kitchenDisplayDate} ${timeOnly}`, `No: ${trASCII(String(data.receiptNumber || data.id || '000000'))}`);
                if (data.waiterName && profile.showWaiter !== false) {
                  thermalPrinter.bold(true);
                  thermalPrinter.println(`Garson: ${trASCII(data.waiterName)}`);
                  thermalPrinter.bold(false);
                }
                if (target.type === 'MAIN') {
                  thermalPrinter.println(`Profil: ${trASCII(target.profileName)}`);
                }
                thermalPrinter.drawLine();
                
                // Normal font boyutuna dön
                thermalPrinter.setTextSize(tw, th);

                // === ÜRÜN LİSTESİ ===
                const immediateItems = profile.infoOnly && profile.showPrice 
                  ? group.items.filter((i: any) => !i.isCancelled) // Müşteri fişi ise iptal edilmeyenlerin hepsini (bekleyenler dahil) ana listeye al
                  : group.items.filter((i: any) => !i.isWaiting); // Müşteri fişi değilse sadece hemen hazırlananlar

                const waitingItems = profile.infoOnly && profile.showPrice
                  ? [] // Müşteri fişi ise bekleyenler ayrı başlıkta gösterilmeyecek
                  : group.items.filter((i: any) => i.isWaiting);

                for (const item of immediateItems) {
                  thermalPrinter.bold(true);

                  let portionStr = '';
                  if (item.saleType === 'HALF') portionStr = '(YARIM) ';
                  else if (item.saleType === 'DOUBLE') portionStr = '(DUBLE) ';

                  const itemName = item.name || item.product?.name || 'Urun';
                  if (profile.showPrice) {
                    // Müşteri fişi formatı (fiyat gösterimli)
                    const txLabel = getTransactionLabel(item.transactionType);
                    const totalStr = txLabel && Number(item.total || item.price * item.quantity) === 0
                      ? `[${txLabel}]`
                      : txLabel
                        ? `${Number(item.total || item.price * item.quantity).toFixed(2)} TL [${txLabel}]`
                        : `${Number(item.total || item.price * item.quantity).toFixed(2)} TL`;
                    thermalPrinter.leftRight(`${item.quantity}x ${portionStr}${trASCII(itemName)}`, totalStr);
                    if (Number(item.discountAmount || 0) > 0) {
                      thermalPrinter.println(`  Indirim: -${Number(item.discountAmount).toFixed(2)} TL`);
                    }
                  } else {
                    // Normal mutfak formatı (Bitişik gösterim)
                    thermalPrinter.println(`${item.quantity}x ${portionStr}${trASCII(itemName)}`);
                  }
                  thermalPrinter.bold(false);
                  
                  if (profile.showPortion !== false) {
                    if (item.subItems && item.subItems.length > 0) {
                      for (const sub of item.subItems) {
                        const subName = trASCII(sub.product?.name || sub.name || `Urun #${sub.productId}`);
                        const subQty = sub.quantity && sub.quantity > 1 ? `${sub.quantity}x ` : '';
                        thermalPrinter.println(`  + ${subQty}${subName}`);
                      }
                    }
                    if (item.note) thermalPrinter.println(`  Not: ${trASCII(item.note)}`);
                    if (item.status === 'REFUNDED' && item.refundReason) thermalPrinter.println(`  Iade Sebep: ${trASCII(item.refundReason)}`);
                    if (item.status === 'CANCELLED' && item.cancelReason) thermalPrinter.println(`  Iptal Sebep: ${trASCII(item.cancelReason)}`);
                  }
                }

                // === BEKLEYENLER ===
                if (waitingItems.length > 0) {
                  thermalPrinter.drawLine();
                  thermalPrinter.alignCenter();
                  thermalPrinter.bold(true);
                  thermalPrinter.println('--- BEKLEYENLER ---');
                  thermalPrinter.bold(false);
                  thermalPrinter.alignLeft();
                  thermalPrinter.drawLine();
                  for (const item of waitingItems) {
                    thermalPrinter.bold(true);

                    let portionStr = '';
                    if (item.saleType === 'HALF') portionStr = '(YARIM) ';
                    else if (item.saleType === 'DOUBLE') portionStr = '(DUBLE) ';

                    const itemName = item.name || item.product?.name || 'Urun';
                    if (profile.showPrice) {
                      const totalStr = `${Number(item.total || item.price * item.quantity).toFixed(2)} TL`;
                      thermalPrinter.leftRight(`${item.quantity}x ${portionStr}${trASCII(itemName)}`, totalStr);
                      if (Number(item.discountAmount || 0) > 0) {
                        thermalPrinter.println(`  Indirim: -${Number(item.discountAmount).toFixed(2)} TL`);
                      }
                    } else {
                      thermalPrinter.println(`${item.quantity}x ${portionStr}${trASCII(itemName)}`);
                    }
                    thermalPrinter.bold(false);

                    if (profile.showPortion !== false) {
                      if (item.subItems && item.subItems.length > 0) {
                        for (const sub of item.subItems) {
                          const subName = trASCII(sub.product?.name || sub.name || `Urun #${sub.productId}`);
                          const subQty = sub.quantity && sub.quantity > 1 ? `${sub.quantity}x ` : '';
                          thermalPrinter.println(`  + ${subQty}${subName}`);
                        }
                      }
                      if (item.note) thermalPrinter.println(`  Not: ${trASCII(item.note)}`);
                    }
                  }
                }

                if (c > 0) {
                  thermalPrinter.drawLine();
                  thermalPrinter.alignCenter();
                  thermalPrinter.println(`*** KOPYA ${c + 1} ***`);
                }

                // Genel İptal / Sonuç Bilgileri Varsa
                const cancelledItems = profile.infoOnly && profile.showPrice
                  ? [] // Müşteri fişi ise iptal edilenler ayrı başlıkta gösterilmeyecek
                  : group.items.filter((i: any) => i.isCancelled);

                if (cancelledItems && cancelledItems.length > 0) {
                   thermalPrinter.drawLine();
                   thermalPrinter.alignCenter();
                   thermalPrinter.bold(true);
                   thermalPrinter.println('!!! IPTAL EDILENLER !!!');
                   thermalPrinter.bold(false);
                   thermalPrinter.alignLeft();
                   thermalPrinter.drawLine();
                   for (const item of cancelledItems) {
                     thermalPrinter.bold(true);
                     const itemName = item.name || item.product?.name || 'Urun';
                     thermalPrinter.println(`${item.quantity}x IPTAL ${trASCII(itemName)}`);
                     thermalPrinter.bold(false);
                     const reason = item.refundReason || item.cancelReason || item.note;
              if (reason) thermalPrinter.println(`  Sebep: ${trASCII(reason)}`);
                   }
                }

                // Döviz Kurları ve Genel Toplam (Sadece Müşteri Fişi / Adisyon İçin)
                if (profile.showPrice || (profile.infoOnly && profile.showPrice)) {
                  // Siparişin genel toplamını hesapla (sadece iptal edilmeyenler)
                  const totalAmount = group.items
                    .filter((i: any) => !i.isCancelled)
                    .reduce((sum: number, i: any) => sum + (Number(i.total) || Number(i.price) * Number(i.quantity)), 0);

                  const generalDiscount = Number(data.discountAmount || 0);
                  const finalTotalAmount = Number((totalAmount - generalDiscount).toFixed(2));

                  if (generalDiscount > 0) {
                    thermalPrinter.drawLine();
                    thermalPrinter.leftRight('ARA TOPLAM', `${totalAmount.toFixed(2)} TL`);
                    thermalPrinter.leftRight('INDIRIM', `-${generalDiscount.toFixed(2)} TL`);
                  }

                  thermalPrinter.drawLine();
                  // TOPLAM — profil boyutundan 1 kademe büyük
                  const kitchenTotalTw = Math.min((tw || 0) + 1, 2);
                  const kitchenTotalTh = Math.min((th || 0) + 1, 2);
                  thermalPrinter.setTextSize(kitchenTotalTw, kitchenTotalTh);
                  thermalPrinter.bold(true);
                  thermalPrinter.leftRight('TOPLAM', `${finalTotalAmount.toFixed(2)} TL`);
                  thermalPrinter.bold(false);
                  thermalPrinter.setTextNormal();

                  // Döviz Kurlarını Çek ve Yazdır (Profilde açıksa)
                  if (profile.showExchangeRates) {
                    try {
                      const [eurStr, usdStr, gbpStr] = await Promise.all([
                        this.parametersService.getValue('pos', 'eur_rate'),
                        this.parametersService.getValue('pos', 'usd_rate'),
                        this.parametersService.getValue('pos', 'gbp_rate')
                      ]);

                      const eurRate = Number(eurStr) || 37.50;
                      const usdRate = Number(usdStr) || 35.20;
                      const gbpRate = Number(gbpStr) || 44.10;

                      if (finalTotalAmount > 0) {
                        thermalPrinter.drawLine();
                        thermalPrinter.leftRight('EURO  (EUR)', `${(finalTotalAmount / eurRate).toFixed(2)} EUR`);
                        thermalPrinter.leftRight('DOLAR (USD)', `${(finalTotalAmount / usdRate).toFixed(2)} USD`);
                        thermalPrinter.leftRight('STERLIN (GBP)', `${(finalTotalAmount / gbpRate).toFixed(2)} GBP`);
                      }
                    } catch (err) {
                      console.warn('Döviz kurlari alinamadi, atlaniliyor.', err);
                    }
                  }
                }

                thermalPrinter.drawLine();
                thermalPrinter.cut();
                
                // Sesli Uyarı
                if (profile.soundAlert) {
                  thermalPrinter.beep(); // Opsiyonel 2 kez ötmesi için buzzer komutları da eklenebilir
                } else if (target.type === 'MAIN' && !profile.soundAlert) {
                  // Eğer profile özel bir ses ayarı yoksa ama genel yazdırmaysa standart beep kalsın mı? Hayır, profile uysun.
                } else {
                  // default beep if not specified or fallback
                  thermalPrinter.beep(); 
                }

                await thermalPrinter.execute();
                thermalPrinter.clear();
                printCount++;
              } else {
                 console.error(`Printer baglanamadi: ${printer.ipAddress}`);
              }
            } catch (err) {
              console.error(`Printer Hatası [${printer.ipAddress}]:`, err);
            }
          }
        }
      }

      if (printCount === 0) {
        this.logger.warn(`[printKitchen] Hiçbir ürün için çıktı profili/yazıcı bulunamadı. Ürünler: ${itemsToPrint.map((i: any) => i.name).join(', ')}, ZoneId: ${data.zoneId}`);
      }

      return {
        success: true,
        message: `${printCount} adet fiş yazdırıldı.`,
      };
    } catch (error: any) {
      console.error('Mutfak Yazıcı Hatası:', error);
      return { success: false, message: `Yazıcı hatası: ${error.message}` };
    }
  }
  async printMars(
    data: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const item = data.item;
      if (!item) return { success: false, message: 'Ürün bilgisi yok.' };

      const printerId = item.printerId;
      const targetPrinter = await this.printerRepository.findOne({
        where: { id: printerId, isActive: true },
      });

      if (!targetPrinter || !targetPrinter.ipAddress) {
        return { success: false, message: 'Aktif yazıcı bulunamadı.' };
      }

      const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } =
        await import('node-thermal-printer');

      let printerInterface = targetPrinter.ipAddress;
      // 1. IP Adresi kontrolü (Eğer IP formatındaysa tcp:// ekle)
      if (
        printerInterface.includes('.') &&
        !printerInterface.startsWith('tcp://') &&
        !printerInterface.includes('//') &&
        !printerInterface.includes('\\\\')
      ) {
        printerInterface = `tcp://${printerInterface}`;
      }

      // 2. Windows USB/Local Yazıcı kontrolü (Eğer IP/Path değilse ve Windows ise printer: ekle)
      if (
        process.platform === 'win32' &&
        !printerInterface.startsWith('tcp://') &&
        !printerInterface.includes('\\\\') &&
        !printerInterface.includes('/') &&
        !printerInterface.startsWith('printer:')
      ) {
        this.logger.log(`Windows USB Yazıcı formatı düzeltiliyor: ${printerInterface} -> printer:${printerInterface}`);
        printerInterface = `printer:${printerInterface}`;
      }

      const thermalPrinter = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: printerInterface,
        characterSet: CharacterSet.WPC1254_TURKISH,
        removeSpecialCharacters: false,
        lineCharacter: '=',
        breakLine: BreakLine.WORD,
        options: { timeout: 5000 },
      });

      let isConnected = true;
      if (printerInterface.startsWith('tcp://')) {
        isConnected = await thermalPrinter.isPrinterConnected();
      }

      if (!isConnected) return { success: false, message: 'Yazıcı bağlantı hatası.' };

      thermalPrinter.alignCenter();
      thermalPrinter.bold(true);
      thermalPrinter.setTextSize(2, 2);
      thermalPrinter.println('* MARS *');
      
      thermalPrinter.setTextSize(1, 1);
      thermalPrinter.println(data.tableName || 'MASA BILGISI YOK');
      thermalPrinter.setTextNormal();
      thermalPrinter.bold(false);
      thermalPrinter.drawLine();

      thermalPrinter.alignLeft();
      thermalPrinter.println(`${item.quantity}x ${item.name}`);
      if (item.note) {
        thermalPrinter.println(`Not: ${item.note}`);
      }

      thermalPrinter.drawLine();
      thermalPrinter.cut();
      thermalPrinter.beep();

      await thermalPrinter.execute();
      thermalPrinter.clear();

      return { success: true, message: 'Mars fişi yazdırıldı' };
    } catch (error: any) {
      console.error('Mars Yazıcı Hatası:', error);
      return { success: false, message: `Yazıcı hatası: ${error.message}` };
    }
  }

  async printZReport(data: any): Promise<{ success: boolean; message: string }> {
    try {
      let dovizAnalizi = data.dovizAnalizi;
      if (!dovizAnalizi && data.businessDate) {
        try {
          const crFilter = data.cashRegisterId ? `AND s.cashRegisterId = ${data.cashRegisterId}` : '';
          dovizAnalizi = await this.dataSource.query(`
            SELECT 
              COALESCE(s.paidCurrency, 'TRY') as currency,
              SUM(CAST(s.paidCurrencyAmount AS DECIMAL(12,2))) as totalAmount
            FROM sales s
            WHERE s.status = 'COMPLETED' AND s.paidCurrencyAmount > 0 AND s.businessDate = @0 ${crFilter}
            GROUP BY s.paidCurrency
          `, [data.businessDate]);
        } catch (e) {
          this.logger.warn('dovizAnalizi query failed in printZReport:', e);
        }
      }

      // 1. Z_REPORT tipindeki profili bul
      const profile = await this.profileRepository.findOne({
        where: { profileType: 'Z_REPORT', isActive: true },
        relations: ['mainPrinter', 'infoPrinter'],
      });

      if (!profile) {
        return { success: false, message: 'Gün sonu (Z-Raporu) için aktif bir çıktı profili tanımlanmamış.' };
      }

      const printers = [];
      if (profile.mainPrinter) printers.push(profile.mainPrinter);
      if (profile.infoPrinter) printers.push(profile.infoPrinter);

      if (printers.length === 0) {
        return { success: false, message: 'Profilde tanımlı yazıcı bulunamadı.' };
      }

      const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = await import('node-thermal-printer');

      for (const printer of printers) {
        let printerInterface = printer.ipAddress;
        if (printerInterface.includes('.') && !printerInterface.startsWith('tcp://') && !printerInterface.includes('//') && !printerInterface.includes('\\\\')) {
          printerInterface = `tcp://${printerInterface}`;
        }

        const thermalPrinter = new ThermalPrinter({
          type: PrinterTypes.EPSON,
          interface: printerInterface,
          characterSet: CharacterSet.WPC1254_TURKISH,
          removeSpecialCharacters: false,
          lineCharacter: '=',
          breakLine: BreakLine.WORD,
          options: { timeout: 5000 },
        });

        if (printerInterface.startsWith('tcp://')) {
          const isConnected = await thermalPrinter.isPrinterConnected();
          if (!isConnected) continue;
        }

        // Header
        thermalPrinter.alignCenter();
        thermalPrinter.bold(true);
        
        if (profile.showLogo) {
          thermalPrinter.println('*** POSNETX ***');
        }

        let tw = 0, th = 0;
        if (profile.textSize === 'LARGE') { tw = 1; th = 1; }
        else if (profile.textSize === 'XLARGE') { tw = 2; th = 2; }

        thermalPrinter.setTextSize(tw, th);
        thermalPrinter.println(trASCII(profile.customTitle || 'GUN SONU RAPORU'));
        thermalPrinter.setTextNormal();
        thermalPrinter.bold(false);
        thermalPrinter.drawLine();

        // General Info
        thermalPrinter.alignLeft();
        thermalPrinter.println(`Z No: ${data.zNumber || '---'}`);
        thermalPrinter.println(`Tarih: ${new Date(data.createdAt || new Date()).toLocaleString('tr-TR')}`);
        if (data.businessDate) {
          thermalPrinter.println(`Program Tarihi: ${new Date(data.businessDate).toLocaleDateString('tr-TR')}`);
        }
        thermalPrinter.println(`Kasa: ${trASCII(data.cashRegisterName || 'KASA 1')}`);
        thermalPrinter.println(`Kullanici: ${trASCII(data.userName || 'Admin')}`);
        thermalPrinter.drawLine();

        // Sales Totals
        if (profile.showProductSummary) {
          thermalPrinter.alignCenter();
          thermalPrinter.bold(true);
          thermalPrinter.println('--- SATIS TOPLAMLARI ---');
          thermalPrinter.bold(false);
          thermalPrinter.alignLeft();
          
          if (profile.groupByCategory && data.categoryTotals) {
            for (const cat of data.categoryTotals) {
              thermalPrinter.leftRight(trASCII(cat.name || 'Diger'), `${Number(cat.total).toFixed(2)} TL`);
            }
          } else {
            thermalPrinter.leftRight('TOPLAM SATIS', `${Number(data.netSales || data.totalSales).toFixed(2)} TL`);
          }
          thermalPrinter.drawLine();
        }

        // Transaction Analysis
        if (profile.showTransactionAnalysis) {
          thermalPrinter.alignCenter();
          thermalPrinter.bold(true);
          thermalPrinter.println('--- ISLEM ANALIZI ---');
          thermalPrinter.bold(false);
          thermalPrinter.alignLeft();
          thermalPrinter.leftRight('TOPLAM FIS', `${data.totalReceipts || 0}`);
          const iadeAdetStr = data.refundCount > 0 ? ` (${Number(data.refundCount).toFixed(0)} Ad.)` : '';
          thermalPrinter.leftRight('IADE TOPLAM', `${Number(data.refundTotal || 0).toFixed(2)} TL${iadeAdetStr}`);
          thermalPrinter.leftRight('IPTAL TOPLAM', `${Number(data.cancelTotal || 0).toFixed(2)} TL`);
          if (data.discountTotal > 0) thermalPrinter.leftRight('INDIRIM TOPLAM', `${Number(data.discountTotal).toFixed(2)} TL`);
          thermalPrinter.drawLine();
        }

        // Payment Totals (Currency Details logic if requested)
        thermalPrinter.alignCenter();
        thermalPrinter.bold(true);
        thermalPrinter.println('--- ODEME TOPLAMLARI ---');
        thermalPrinter.bold(false);
        thermalPrinter.alignLeft();
        
        if (data.cashCollection !== undefined) {
           thermalPrinter.leftRight('NAKIT', `${Number(data.cashCollection).toFixed(2)} TL`);
           thermalPrinter.leftRight('KREDI KARTI', `${Number(data.creditCardCollection).toFixed(2)} TL`);
           if (data.cariCollection > 0) thermalPrinter.leftRight('CARI', `${Number(data.cariCollection).toFixed(2)} TL`);
        } else if (data.paymentTotals) {
          for (const pt of data.paymentTotals) {
            thermalPrinter.leftRight(trASCII(pt.method === 'CASH' ? 'NAKIT' : pt.method === 'CREDIT_CARD' ? 'KREDI KARTI' : pt.method), `${Number(pt.total).toFixed(2)} TL`);
          }
        }
        thermalPrinter.drawLine();

        // Exchange Currency Analysis (Döviz Analizi)
        if (dovizAnalizi && dovizAnalizi.length > 0) {
          thermalPrinter.alignCenter();
          thermalPrinter.bold(true);
          thermalPrinter.println('--- ALINAN DOVIZ TOPLAMLARI ---');
          thermalPrinter.bold(false);
          thermalPrinter.alignLeft();
          for (const d of dovizAnalizi) {
            thermalPrinter.leftRight(trASCII(d.currency), `${Number(d.totalAmount).toFixed(2)}`);
          }
          thermalPrinter.drawLine();
        }

        // VAT Summary
        if (profile.showVatSummary && data.taxTotal !== undefined) {
          thermalPrinter.alignCenter();
          thermalPrinter.bold(true);
          thermalPrinter.println('--- KDV OZETI ---');
          thermalPrinter.bold(false);
          thermalPrinter.alignLeft();
          thermalPrinter.leftRight('MATRAH', `${Number(data.taxBase).toFixed(2)} TL`);
          thermalPrinter.leftRight('KDV TOPLAM', `${Number(data.taxTotal).toFixed(2)} TL`);
          thermalPrinter.drawLine();
        }

        // Guest Stats
        if (profile.showGuestStats && data.totalProductCount !== undefined) {
          thermalPrinter.alignCenter();
          thermalPrinter.bold(true);
          thermalPrinter.println('--- ISTATISTIKLER ---');
          thermalPrinter.bold(false);
          thermalPrinter.alignLeft();
          thermalPrinter.leftRight('URUN ADEDI', `${data.totalProductCount}`);
          if (data.serviceFeeTotal > 0) thermalPrinter.leftRight('SERVIS BEDELI', `${Number(data.serviceFeeTotal).toFixed(2)} TL`);
          thermalPrinter.drawLine();
        }

        // Waiter Sales
        if (profile.showWaiterSales && data.waiterSales) {
          thermalPrinter.alignCenter();
          thermalPrinter.bold(true);
          thermalPrinter.println('--- GARSON SATISLARI ---');
          thermalPrinter.bold(false);
          thermalPrinter.alignLeft();
          for (const ws of data.waiterSales) {
            thermalPrinter.leftRight(trASCII(ws.waiterName), `${Number(ws.total).toFixed(2)} TL`);
          }
          thermalPrinter.drawLine();
        }

        // Exchange Rates
        if (profile.showExchangeRates) {
          try {
            const [eurStr, usdStr] = await Promise.all([
              this.parametersService.getValue('pos', 'eur_rate'),
              this.parametersService.getValue('pos', 'usd_rate')
            ]);
            thermalPrinter.alignCenter();
            thermalPrinter.bold(true);
            thermalPrinter.println('--- DOVIZ KURLARI ---');
            thermalPrinter.bold(false);
            thermalPrinter.alignLeft();
            thermalPrinter.leftRight('EUR', `${Number(eurStr || 0).toFixed(2)}`);
            thermalPrinter.leftRight('USD', `${Number(usdStr || 0).toFixed(2)}`);
            thermalPrinter.drawLine();
          } catch (e) {}
        }

        // Summary
        thermalPrinter.bold(true);
        thermalPrinter.setTextSize(tw, th);
        thermalPrinter.leftRight('GENEL TOPLAM', `${Number(data.totalSales).toFixed(2)} TL`);
        thermalPrinter.setTextNormal();
        thermalPrinter.bold(false);
        thermalPrinter.drawLine();

        thermalPrinter.alignCenter();
        thermalPrinter.println('Mali Degeri Yoktur');
        thermalPrinter.cut();
        if (profile.soundAlert) thermalPrinter.beep();

        await thermalPrinter.execute();
        thermalPrinter.clear();
      }

      return { success: true, message: 'Gun sonu raporu yazdirildi.' };
    } catch (error: any) {
      console.error('Z-Report Print Error:', error);
      return { success: false, message: `Yazdirma hatasi: ${error.message}` };
    }
  }

  async printZReportDetailed(zReportId: number, printerId: number, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Verileri Hazırla
      const [zReport] = await this.dataSource.query(`SELECT * FROM z_reports WHERE id = @0`, [zReportId]);
      if (!zReport) throw new NotFoundException('Z-Raporu bulunamadı.');

      const printer = await this.printerRepository.findOne({ where: { id: printerId } });
      if (!printer) throw new NotFoundException('Yazıcı bulunamadı.');

      const [userInfo] = await this.dataSource.query(`SELECT firstName, lastName FROM users WHERE id = @0`, [userId]);
      const userName = userInfo ? `${userInfo.firstName} ${userInfo.lastName}`.trim() : 'Bilinmeyen Kullanıcı';

      const [crInfo] = await this.dataSource.query(`SELECT name FROM cash_registers WHERE id = @0`, [zReport.cashRegisterId]);
      const cashRegisterName = crInfo?.name || `Kasa #${zReport.cashRegisterId}`;

      // 2. Z_REPORT Çıktı Profilini Yükle (profil yoksa varsayılan ayarlarla devam et)
      const profile = await this.profileRepository.findOne({
        where: { profileType: 'Z_REPORT', isActive: true },
        relations: ['mainPrinter', 'infoPrinter'],
      });

      // 3. Detaylı Ürün Satışlarını Çek (businessDate bazlı, vardiyadan bağımsız)
      let productSales: any[] = [];
      try {
        const crFilterProd = zReport.cashRegisterId ? `AND s.cashRegisterId = ${zReport.cashRegisterId}` : '';
        productSales = await this.dataSource.query(`
          SELECT p.name, SUM(CAST(si.quantity AS DECIMAL(12,2))) as quantity, SUM(CAST(si.total AS DECIMAL(12,2))) as total
          FROM sale_items si 
          JOIN sales s ON s.id = si.saleId
          JOIN products p ON p.id = si.productId
          WHERE s.businessDate = @0 AND (s.companyId = @1 OR s.companyId IS NULL) AND s.status = 'COMPLETED' AND si.status = 'ACTIVE' ${crFilterProd}
          GROUP BY p.name ORDER BY total DESC
        `, [zReport.businessDate, zReport.companyId]);
      } catch (e) { this.logger.warn('Urun satislari cekilemedi:', e); }

      // 3.1. Giderler (Kasadan Ödeme)
      let payoutTotal = 0;
      try {
        const expenseRes = await this.dataSource.query(`
          SELECT SUM(CAST(amount AS DECIMAL(12,2))) as payout
          FROM account_transactions s
          WHERE s.type = 'EXPENSE' AND s.businessDate = @0
        `, [zReport.businessDate]);
        payoutTotal = Number(expenseRes[0]?.payout || 0);
      } catch (e) { this.logger.warn('Giderler cekilemedi:', e); }

      // 3.2. Cari Tahsilat Kırılımları (Nakit/Kart)
      let cariNakit = 0, cariKredi = 0;
      try {
        const cariCollectionsRes = await this.dataSource.query(`
          SELECT 
            s.paymentMethod,
            SUM(CAST(s.amount AS DECIMAL(12,2))) as toplam
          FROM account_transactions s
          WHERE s.type = 'INCOME' AND s.partnerId > 0 AND s.businessDate = @0
          GROUP BY s.paymentMethod
        `, [zReport.businessDate]);
        cariNakit = Number(cariCollectionsRes.find((c: any) => c.paymentMethod === 'KASA' || c.paymentMethod === 'CASH')?.toplam || 0);
        cariKredi = Number(cariCollectionsRes.find((c: any) => c.paymentMethod === 'KREDI_KARTI' || c.paymentMethod === 'CREDIT_CARD')?.toplam || 0);
      } catch (e) { this.logger.warn('Cari tahsilatlar cekilemedi:', e); }

      // 3.3. Döviz Analizi
      let dovizAnalizi: any[] = [];
      try {
        const crFilter = zReport.cashRegisterId ? `AND s.cashRegisterId = ${zReport.cashRegisterId}` : '';
        dovizAnalizi = await this.dataSource.query(`
          SELECT 
            COALESCE(s.paidCurrency, 'TRY') as currency,
            SUM(CAST(s.paidCurrencyAmount AS DECIMAL(12,2))) as totalAmount
          FROM sales s
          WHERE s.status = 'COMPLETED' AND s.paidCurrencyAmount > 0 AND s.businessDate = @0 ${crFilter}
          GROUP BY s.paidCurrency
        `, [zReport.businessDate]);
      } catch (e) { this.logger.warn('Doviz analizi cekilemedi:', e); }

      // 3.4. İşlem Kırılımları (İade, İptal, İkram, Ödenmez vb.)
      let islemDetaylari: any[] = [];
      try {
        const crFilter = zReport.cashRegisterId ? `AND s.cashRegisterId = ${zReport.cashRegisterId}` : '';
        islemDetaylari = await this.dataSource.query(`
          SELECT 
            si.status,
            si.transactionType,
            SUM(CAST(si.quantity AS DECIMAL(12,2))) as adet,
            SUM(CAST(si.total AS DECIMAL(12,2))) as toplam,
            SUM(CAST(COALESCE(p.price, 0) * si.quantity AS DECIMAL(12,2))) as retailToplam
          FROM sale_items si
          JOIN sales s ON s.id = si.saleId
          LEFT JOIN products p ON p.id = si.productId
          WHERE s.status = 'COMPLETED' AND s.businessDate = @0 ${crFilter}
          GROUP BY si.status, si.transactionType
        `, [zReport.businessDate]);
      } catch (e) { this.logger.warn('Islem detaylari cekilemedi:', e); }

      // 3.5. İndirim Toplamları
      let satisIndirim = 0, cariIndirim = 0;
      try {
        const crFilter = zReport.cashRegisterId ? `AND s.cashRegisterId = ${zReport.cashRegisterId}` : '';
        const indirimDetayRes = await this.dataSource.query(`
          SELECT 
            CASE WHEN s.paymentMethod IN ('CARI', 'PARTNER', 'OPEN') THEN 'CARI' ELSE 'SATIS' END as tip,
            SUM(CAST(s.discountAmount AS DECIMAL(12,2))) as toplam
          FROM sales s
          WHERE s.status = 'COMPLETED' AND s.discountAmount > 0 AND s.businessDate = @0 ${crFilter}
          GROUP BY CASE WHEN s.paymentMethod IN ('CARI', 'PARTNER', 'OPEN') THEN 'CARI' ELSE 'SATIS' END
        `, [zReport.businessDate]);
        satisIndirim = Number(indirimDetayRes.find((i: any) => i.tip === 'SATIS')?.toplam || 0);
        cariIndirim = Number(indirimDetayRes.find((i: any) => i.tip === 'CARI')?.toplam || 0);
      } catch (e) { this.logger.warn('Indirim detaylari cekilemedi:', e); }

      // 3.6. Açık Hesap Detayı
      let acikHesapDetay: any[] = [];
      try {
        const crFilter = zReport.cashRegisterId ? `AND s.cashRegisterId = ${zReport.cashRegisterId}` : '';
        acikHesapDetay = await this.dataSource.query(`
          SELECT 
            COALESCE(p.name, 'Bilinmeyen Cari') as cariAdi,
            SUM(CAST(s.totalAmount AS DECIMAL(12,2))) as toplam
          FROM sales s
          JOIN partners p ON p.id = s.partnerId
          WHERE s.status = 'COMPLETED' AND s.paymentMethod IN ('CARI', 'PARTNER', 'OPEN') AND s.businessDate = @0 ${crFilter}
          GROUP BY p.name
        `, [zReport.businessDate]);
      } catch (e) { this.logger.warn('Acik hesap detaylari cekilemedi:', e); }

      // 3.7. Kasiyer / Kasa Tahsilat Toplamları
      let kasiyerTahsilat: any[] = [];
      try {
        const crFilter = zReport.cashRegisterId ? `AND s.cashRegisterId = ${zReport.cashRegisterId}` : '';
        kasiyerTahsilat = await this.dataSource.query(`
          SELECT 
            COALESCE(cr.name, 'Ana Kasa') as kasaAdi,
            SUM(CAST(s.totalAmount AS DECIMAL(12,2))) as toplam
          FROM sales s
          LEFT JOIN cash_registers cr ON cr.id = s.cashRegisterId
          WHERE s.status = 'COMPLETED' AND s.businessDate = @0 ${crFilter}
          GROUP BY cr.name
        `, [zReport.businessDate]);
      } catch (e) { this.logger.warn('Kasiyer tahsilatlari cekilemedi:', e); }

      // 3.8. Müşteri / Hizmet Tipi Toplamları
      let musteriToplamlari: any[] = [];
      try {
        const crFilter = zReport.cashRegisterId ? `AND s.cashRegisterId = ${zReport.cashRegisterId}` : '';
        musteriToplamlari = await this.dataSource.query(`
          SELECT 
            CASE 
              WHEN s.tableName LIKE 'Paket%' OR s.tableName LIKE 'Servis%' OR s.tableName LIKE 'Delivery%' THEN 'PAKET' 
              ELSE 'MASA' 
            END as tip,
            COUNT(s.id) as adet,
            SUM(CAST(s.totalAmount AS DECIMAL(12,2))) as toplam
          FROM sales s
          WHERE s.status = 'COMPLETED' AND s.businessDate = @0 ${crFilter}
          GROUP BY CASE 
            WHEN s.tableName LIKE 'Paket%' OR s.tableName LIKE 'Servis%' OR s.tableName LIKE 'Delivery%' THEN 'PAKET' 
            ELSE 'MASA' 
          END
        `, [zReport.businessDate]);
      } catch (e) { this.logger.warn('Musteri toplamlari cekilemedi:', e); }

      // JSON alanları parse et
      let categoryTotals: any[] = [];
      let paymentTotals: any[] = [];
      let waiterSales: any[] = [];
      try { categoryTotals = typeof zReport.categoryTotals === 'string' ? JSON.parse(zReport.categoryTotals) : (zReport.categoryTotals || []); } catch {}
      try { paymentTotals = typeof zReport.paymentTotals === 'string' ? JSON.parse(zReport.paymentTotals) : (zReport.paymentTotals || []); } catch {}
      try { waiterSales = typeof zReport.waiterSales === 'string' ? JSON.parse(zReport.waiterSales) : (zReport.waiterSales || []); } catch {}

      const data = { 
        ...zReport, 
        userName, 
        cashRegisterName, 
        productSales, 
        categoryTotals, 
        paymentTotals, 
        waiterSales,
        payoutTotal,
        cariNakit,
        cariKredi,
        dovizAnalizi,
        islemDetaylari,
        satisIndirim,
        cariIndirim,
        acikHesapDetay,
        kasiyerTahsilat,
        musteriToplamlari
      };

      // 4. Yazıcı Bağlantısını Kur (Frontend'den seçilen yazıcı)
      const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = await import('node-thermal-printer');
      let printerInterface = printer.ipAddress;
      if (printerInterface.includes('.') && !printerInterface.startsWith('tcp://') && !printerInterface.includes('//') && !printerInterface.includes('\\\\')) {
        printerInterface = `tcp://${printerInterface}`;
      }
      if (process.platform === 'win32' && !printerInterface.startsWith('tcp://') && !printerInterface.includes('\\\\') && !printerInterface.includes('/') && !printerInterface.startsWith('printer:')) {
        printerInterface = `printer:${printerInterface}`;
      }

      const thermalPrinter = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: printerInterface,
        characterSet: CharacterSet.WPC1254_TURKISH,
        removeSpecialCharacters: false,
        lineCharacter: '=',
        breakLine: BreakLine.WORD,
        options: { timeout: 5000 },
      });

      if (printerInterface.startsWith('tcp://')) {
        const isConnected = await thermalPrinter.isPrinterConnected();
        if (!isConnected) throw new Error('Yaziciya baglanamadi.');
      }

      // 5. Fiş İçeriği — Profil Ayarlarına Göre
      let tw = 0, th = 0;
      if (profile?.textSize === 'LARGE') { tw = 1; th = 1; }
      else if (profile?.textSize === 'XLARGE') { tw = 2; th = 2; }

      // BAŞLIK
      thermalPrinter.alignCenter();
      thermalPrinter.bold(true);
      if (profile?.showLogo !== false) {
        const companyName = await this.parametersService.getValue('pos', 'company_name').catch(() => '');
        thermalPrinter.println(`*** ${trASCII(companyName || 'POSNETX')} ***`);
      }
      thermalPrinter.setTextSize(tw, th);
      thermalPrinter.println(trASCII(profile?.customTitle || 'GUN SONU RAPORU'));
      thermalPrinter.setTextNormal();
      thermalPrinter.bold(false);
      thermalPrinter.drawLine();

      // BİLGİ
      thermalPrinter.alignLeft();
      thermalPrinter.println(`Z No     : ${data.zNumber || '---'}`);
      thermalPrinter.println(`Tarih    : ${new Date(data.createdAt || new Date()).toLocaleString('tr-TR')}`);
      thermalPrinter.println(`P.Tarihi : ${new Date(data.businessDate).toLocaleDateString('tr-TR')}`);
      thermalPrinter.println(`Kasa     : ${trASCII(data.cashRegisterName)}`);
      thermalPrinter.println(`Kasiyer  : ${trASCII(data.userName)}`);
      thermalPrinter.drawLine();

      // SATIŞ TOPLAMLARI (showProductSummary)
      if (profile?.showProductSummary !== false) {
        thermalPrinter.alignCenter(); thermalPrinter.bold(true);
        thermalPrinter.println('--- SATIS TOPLAMLARI ---');
        thermalPrinter.bold(false); thermalPrinter.alignLeft();
        if (profile?.groupByCategory && categoryTotals.length > 0) {
          for (const cat of categoryTotals) thermalPrinter.leftRight(trASCII(cat.name || 'Diger'), `${Number(cat.total).toFixed(2)} TL`);
        } else {
          thermalPrinter.leftRight('TOPLAM SATIS', `${Number(data.netSales || 0).toFixed(2)} TL`);
        }
        thermalPrinter.drawLine();
      }

      // ÜRÜN BAZLI SATIŞLAR
      if (productSales.length > 0) {
        thermalPrinter.alignCenter(); thermalPrinter.bold(true);
        thermalPrinter.println('--- URUN BAZLI SATISLAR ---');
        thermalPrinter.bold(false); thermalPrinter.alignLeft();
        for (const p of productSales) {
          thermalPrinter.leftRight(`${Number(p.quantity).toFixed(0)}x ${trASCII(p.name).substring(0, 18)}`, `${Number(p.total).toFixed(2)} TL`);
        }
        thermalPrinter.drawLine();
      }

      // İŞLEM ANALİZİ (showTransactionAnalysis)
      if (profile?.showTransactionAnalysis !== false) {
        thermalPrinter.alignCenter(); thermalPrinter.bold(true);
        thermalPrinter.println('--- ISLEM ANALIZI ---');
        thermalPrinter.bold(false); thermalPrinter.alignLeft();
        thermalPrinter.leftRight('TOPLAM FIS', `${data.totalReceipts || 0}`);
        thermalPrinter.leftRight('URUN ADEDI', `${data.totalProductCount || 0}`);

        const iadeItemTotal = data.islemDetaylari?.filter((i: any) => i.status === 'REFUNDED').reduce((sum: number, i: any) => sum + Number(i.toplam), 0) || 0;
        const iadeItemQty = data.islemDetaylari?.filter((i: any) => i.status === 'REFUNDED').reduce((sum: number, i: any) => sum + Number(i.adet), 0) || 0;
        const odenmezItemTotal = data.islemDetaylari?.filter((i: any) => i.transactionType === 'NON_PAYABLE' && i.status === 'ACTIVE').reduce((sum: number, i: any) => sum + Number(i.retailToplam), 0) || 0;
        const silinenItemTotal = data.islemDetaylari?.filter((i: any) => i.status === 'CANCELLED').reduce((sum: number, i: any) => sum + Number(i.toplam), 0) || 0;
        const ikramItemTotal = data.islemDetaylari?.filter((i: any) => i.transactionType === 'COMPLIMENTARY' && i.status === 'ACTIVE').reduce((sum: number, i: any) => sum + Number(i.retailToplam), 0) || 0;
        const satisItemTotal = data.islemDetaylari?.filter((i: any) => i.transactionType === 'SALE' && i.status === 'ACTIVE').reduce((sum: number, i: any) => sum + Number(i.toplam), 0) || 0;
        const personelItemTotal = data.islemDetaylari?.filter((i: any) => i.transactionType === 'STAFF' && i.status === 'ACTIVE').reduce((sum: number, i: any) => sum + Number(i.retailToplam), 0) || 0;
        const promosyonItemTotal = data.islemDetaylari?.filter((i: any) => i.transactionType === 'PROMOTION' && i.status === 'ACTIVE').reduce((sum: number, i: any) => sum + Number(i.retailToplam), 0) || 0;

        thermalPrinter.leftRight('SATIS', `${satisItemTotal.toFixed(2)} TL`);
        if (ikramItemTotal > 0) thermalPrinter.leftRight('IKRAM', `${ikramItemTotal.toFixed(2)} TL`);
        if (silinenItemTotal > 0) thermalPrinter.leftRight('IPTAL', `${silinenItemTotal.toFixed(2)} TL`);
        if (iadeItemTotal > 0) thermalPrinter.leftRight('IADE', `${iadeItemTotal.toFixed(2)} TL (${iadeItemQty.toFixed(0)} Ad.)`);
        if (odenmezItemTotal > 0) thermalPrinter.leftRight('ODENMEZ', `${odenmezItemTotal.toFixed(2)} TL`);
        if (personelItemTotal > 0) thermalPrinter.leftRight('PERSONEL', `${personelItemTotal.toFixed(2)} TL`);
        if (promosyonItemTotal > 0) thermalPrinter.leftRight('PROMOSYON', `${promosyonItemTotal.toFixed(2)} TL`);

        if (Number(data.serviceFeeTotal) > 0) thermalPrinter.leftRight('SERVIS BEDELI', `${Number(data.serviceFeeTotal).toFixed(2)} TL`);
        thermalPrinter.drawLine();
      }

      // ÖDEME TOPLAMLARI
      thermalPrinter.alignCenter(); thermalPrinter.bold(true);
      thermalPrinter.println('--- ODEME TOPLAMLARI ---');
      thermalPrinter.bold(false); thermalPrinter.alignLeft();

      thermalPrinter.leftRight('SATIS NAKIT', `${Number(data.cashCollection || 0).toFixed(2)} TL`);
      if (Number(data.cariNakit || 0) > 0) thermalPrinter.leftRight('CARI NAKIT', `${Number(data.cariNakit).toFixed(2)} TL`);
      thermalPrinter.leftRight('SATIS KREDI', `${Number(data.creditCardCollection || 0).toFixed(2)} TL`);
      if (Number(data.cariKredi || 0) > 0) thermalPrinter.leftRight('CARI KREDI', `${Number(data.cariKredi).toFixed(2)} TL`);
      if (Number(data.cariCollection || 0) > 0) thermalPrinter.leftRight('CARI HESAP', `${Number(data.cariCollection).toFixed(2)} TL`);
      if (Number(data.payoutTotal || 0) > 0) thermalPrinter.leftRight('KASADAN ODEME (-)', `${Number(data.payoutTotal).toFixed(2)} TL`);

      const netTahsilat = (Number(data.cashCollection || 0) + Number(data.creditCardCollection || 0) + Number(data.cariCollection || 0) + Number(data.cariNakit || 0) + Number(data.cariKredi || 0)) - Number(data.payoutTotal || 0);
      thermalPrinter.bold(true);
      thermalPrinter.leftRight('NET TAHSILAT', `${netTahsilat.toFixed(2)} TL`);
      thermalPrinter.bold(false);
      thermalPrinter.drawLine();

      // ALINAN DÖVİZ TOPLAMLARI
      if (dovizAnalizi && dovizAnalizi.length > 0) {
        thermalPrinter.alignCenter(); thermalPrinter.bold(true);
        thermalPrinter.println('--- ALINAN DOVIZ TOPLAMLARI ---');
        thermalPrinter.bold(false); thermalPrinter.alignLeft();
        for (const d of dovizAnalizi) {
          thermalPrinter.leftRight(trASCII(d.currency), `${Number(d.totalAmount).toFixed(2)}`);
        }
        thermalPrinter.drawLine();
      }

      // İNDİRİM DETAYLARI
      if (Number(data.satisIndirim || 0) > 0 || Number(data.cariIndirim || 0) > 0) {
        thermalPrinter.alignCenter(); thermalPrinter.bold(true);
        thermalPrinter.println('--- INDIRIM DETAYLARI ---');
        thermalPrinter.bold(false); thermalPrinter.alignLeft();
        if (Number(data.satisIndirim || 0) > 0) thermalPrinter.leftRight('SATIS INDIRIMI', `${Number(data.satisIndirim).toFixed(2)} TL`);
        if (Number(data.cariIndirim || 0) > 0) thermalPrinter.leftRight('CARI HESAP IND.', `${Number(data.cariIndirim).toFixed(2)} TL`);
        thermalPrinter.drawLine();
      }

      // AÇIK HESAP DETAYLARI (Cari Liste)
      if (data.acikHesapDetay && data.acikHesapDetay.length > 0) {
        thermalPrinter.alignCenter(); thermalPrinter.bold(true);
        thermalPrinter.println('--- ACIK HESAP LISTESI ---');
        thermalPrinter.bold(false); thermalPrinter.alignLeft();
        for (const a of data.acikHesapDetay) {
          thermalPrinter.leftRight(trASCII(a.cariAdi), `${Number(a.toplam).toFixed(2)} TL`);
        }
        thermalPrinter.drawLine();
      }

      // KASA TAHSİLATLARI
      if (data.kasiyerTahsilat && data.kasiyerTahsilat.length > 0) {
        thermalPrinter.alignCenter(); thermalPrinter.bold(true);
        thermalPrinter.println('--- KASA TAHSILATLARI ---');
        thermalPrinter.bold(false); thermalPrinter.alignLeft();
        for (const k of data.kasiyerTahsilat) {
          thermalPrinter.leftRight(trASCII(k.kasaAdi), `${Number(k.toplam).toFixed(2)} TL`);
        }
        thermalPrinter.drawLine();
      }

      // HİZMET TİPLERİ (Paket / Masa)
      if (data.musteriToplamlari && data.musteriToplamlari.length > 0) {
        thermalPrinter.alignCenter(); thermalPrinter.bold(true);
        thermalPrinter.println('--- HIZMET TIPLERI ---');
        thermalPrinter.bold(false); thermalPrinter.alignLeft();
        for (const m of data.musteriToplamlari) {
          thermalPrinter.leftRight(trASCII(m.tip === 'PAKET' ? 'PAKET (SERVIS)' : 'MASA (KISI)'), `${Number(m.toplam).toFixed(2)} TL (${m.adet} Ad.)`);
        }
        thermalPrinter.drawLine();
      }

      // KATEGORİ X İŞLEM TİPİ DAĞILIMI (Bölüm Detayları)
      let catTxTotals: any[] = [];
      if (typeof data.categoryTransactionTotals === 'string') {
        try { catTxTotals = JSON.parse(data.categoryTransactionTotals); } catch {}
      } else if (Array.isArray(data.categoryTransactionTotals)) {
        catTxTotals = data.categoryTransactionTotals;
      }
      
      if (catTxTotals && catTxTotals.length > 0) {
        thermalPrinter.alignCenter(); thermalPrinter.bold(true);
        thermalPrinter.println('--- BOLUM ISLEM DETAYLARI ---');
        thermalPrinter.bold(false); thermalPrinter.alignLeft();
        for (const ct of catTxTotals) {
          const typeStr = ct.transactionType === 'SALE' && ct.status === 'ACTIVE' ? 'SATIS' :
                          ct.transactionType === 'COMPLIMENTARY' && ct.status === 'ACTIVE' ? 'IKRAM' :
                          ct.status === 'CANCELLED' ? 'IPTAL' :
                          ct.status === 'REFUNDED' ? 'IADE' :
                          ct.transactionType === 'NON_PAYABLE' && ct.status === 'ACTIVE' ? 'ODENMEZ' :
                          ct.transactionType === 'STAFF' && ct.status === 'ACTIVE' ? 'PERSONEL' :
                          ct.transactionType === 'PROMOTION' && ct.status === 'ACTIVE' ? 'PROMOSYON' : ct.transactionType || ct.status;
          
          thermalPrinter.leftRight(
            `${trASCII(ct.categoryName).substring(0, 12)} [${trASCII(typeStr)}]`,
            `${Number(ct.total).toFixed(2)} TL (${Number(ct.quantity).toFixed(0)} Ad.)`
          );
        }
        thermalPrinter.drawLine();
      }

      // KDV ÖZETİ (showVatSummary)
      if (profile?.showVatSummary && Number(data.taxTotal) > 0) {
        thermalPrinter.alignCenter(); thermalPrinter.bold(true);
        thermalPrinter.println('--- KDV OZETI ---');
        thermalPrinter.bold(false); thermalPrinter.alignLeft();
        thermalPrinter.leftRight('MATRAH', `${Number(data.taxBase || 0).toFixed(2)} TL`);
        thermalPrinter.leftRight('KDV TOPLAM', `${Number(data.taxTotal || 0).toFixed(2)} TL`);
        thermalPrinter.drawLine();
      }

      // GARSON SATIŞLARI (showWaiterSales)
      if (profile?.showWaiterSales && waiterSales.length > 0) {
        thermalPrinter.alignCenter(); thermalPrinter.bold(true);
        thermalPrinter.println('--- GARSON SATISLARI ---');
        thermalPrinter.bold(false); thermalPrinter.alignLeft();
        for (const ws of waiterSales) thermalPrinter.leftRight(trASCII(ws.waiterName || ws.name || '?'), `${Number(ws.total).toFixed(2)} TL`);
        thermalPrinter.drawLine();
      }

      // DÖVİZ KURLARI (showExchangeRates)
      if (profile?.showExchangeRates) {
        try {
          const [eurStr, usdStr] = await Promise.all([
            this.parametersService.getValue('pos', 'eur_rate'),
            this.parametersService.getValue('pos', 'usd_rate'),
          ]);
          thermalPrinter.alignCenter(); thermalPrinter.bold(true);
          thermalPrinter.println('--- DOVIZ KURLARI ---');
          thermalPrinter.bold(false); thermalPrinter.alignLeft();
          thermalPrinter.leftRight('EUR', `${Number(eurStr || 0).toFixed(2)}`);
          thermalPrinter.leftRight('USD', `${Number(usdStr || 0).toFixed(2)}`);
          thermalPrinter.drawLine();
        } catch {}
      }

      // GENEL TOPLAM
      thermalPrinter.bold(true);
      thermalPrinter.setTextSize(tw > 0 ? tw : 1, th > 0 ? th : 1);
      thermalPrinter.leftRight('GENEL TOPLAM', `${Number(data.netSales || 0).toFixed(2)} TL`);
      thermalPrinter.setTextNormal();
      thermalPrinter.bold(false);
      thermalPrinter.drawLine();

      thermalPrinter.alignCenter();
      thermalPrinter.println('Mali Degeri Yoktur');
      thermalPrinter.cut();
      if (profile?.soundAlert) thermalPrinter.beep();

      await thermalPrinter.execute();
      thermalPrinter.clear();

      return { success: true, message: 'Gun sonu raporu profil ayarlariyla yazdirildi.' };
    } catch (err: any) {
      this.logger.error(`Detayli Z-Raporu yazdirma hatasi: ${err.message}`);
      return { success: false, message: `Yazdirma hatasi: ${err.message}` };
    }
  }

  async discoverPrinters(): Promise<{ success: boolean, printers: any[], message?: string }> {
    try {
      // First try to use pdf-to-printer to get local Windows printers
      let osPrinters: any[] = [];
      try {
        const ptp = await import('pdf-to-printer');
        // getPrinters returns an array of printer objects which usually have { deviceId, name } or similar.
        const list = await ptp.getPrinters();
        if (Array.isArray(list)) {
          osPrinters = list.filter(Boolean).map((p: any) => ({
            name: String(p.deviceId || p.name || (typeof p === 'string' ? p : 'Bilinmeyen Yazıcı')),
            port: String(p.port || p.portName || ''),
            isDefault: Boolean(p.isDefault)
          }));
        }
      } catch (err) {
        console.warn('pdf-to-printer method failed, system might not support it.', err);
      }

      // If library fails or returns nothing, we can try to fall back to node-thermal-printer's internal interface (if it has one) or just return what we have.
      if (osPrinters.length === 0 && process.platform === 'win32') {
         // Fallback powershell command
         const { exec } = require('child_process');
         const util = require('util');
         const execAsync = util.promisify(exec);
         try {
            const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name, PortName, Shared | ConvertTo-Json"');
            const parsed = JSON.parse(stdout);
            const printersArr = (Array.isArray(parsed) ? parsed : [parsed]).filter(Boolean);
            osPrinters = printersArr.map((p: any) => ({
              name: String(p.Name || 'Bilinmeyen Yazıcı'),
              port: String(p.PortName || ''),
              shared: Boolean(p.Shared)
            }));
         } catch(e) {
            console.warn('Powershell fallback failed', e);
         }
      }

      return {
        success: true,
        printers: osPrinters
      };
    } catch (error: any) {
      console.error('Printer Discovery Hatası:', error);
      return { success: false, printers: [], message: `Yazıcı tarama hatası: ${error.message}` };
    }
  }
}
