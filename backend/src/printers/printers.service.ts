import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Printer } from './printer.entity';
import { CashRegister } from '../cash-registers/cash-register.entity';
import { OrderRoutingService } from '../order-routing/order-routing.service';
import { ParametersService } from '../parameters/parameters.service';
import { OutputProfile } from '../output-profiles/output-profile.entity';

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

    if (data.cashRegisterId) {
      this.logger.log(`Kasa ID ${data.cashRegisterId} için profil/yazıcı aranıyor...`);
      const cashRegister = await this.cashRegisterRepository.findOne({
        where: { id: data.cashRegisterId },
        relations: ['receiptPrinter', 'receiptProfile', 'receiptProfile.mainPrinter', 'receiptProfile.infoPrinter'],
      });
      
      if (cashRegister) {
        if (cashRegister.receiptProfile) {
          const profile = cashRegister.receiptProfile;
          this.logger.log(`Kasa Çıktı Profili bulundu: ${profile.name}`);
          
          // Profil varsa, içindeki yazıcıları listeye ekle
          const targetPrinters = [];
          if (profile.mainPrinter) targetPrinters.push({ printer: profile.mainPrinter, type: 'MAIN', copyCount: profile.copyCount || 1 });
          if (profile.infoPrinter) targetPrinters.push({ printer: profile.infoPrinter, type: 'INFO', copyCount: 1 });
          
          if (targetPrinters.length > 0) {
            return this.printToMultiplePrinters(targetPrinters, data, profile);
          }
        }
        
        if (cashRegister.receiptPrinter) {
          printer = cashRegister.receiptPrinter;
          this.logger.log(`Kasa yazıcısı bulundu (Eski Yöntem): ${printer.name} (${printer.ipAddress})`);
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

    // Tek yazıcı için tek kopya yazdır
    return this.printToMultiplePrinters([{ printer, type: 'MAIN', copyCount: 1 }], data);
  }

  private async printToMultiplePrinters(
    targets: { printer: Printer; type: string; copyCount: number }[],
    data: any,
    profile?: OutputProfile
  ): Promise<{ success: boolean; message: string }> {
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
          
          if (profile?.showTable !== false && data.tableName) {
            const headerTw = Math.max(0, tw === 0 ? 1 : tw);
            const headerTh = Math.max(0, th === 0 ? 1 : th);
            thermalPrinter.setTextSize(headerTw, headerTh);
            thermalPrinter.println(trASCII(data.tableName));
            thermalPrinter.setTextSize(tw, th);
            thermalPrinter.bold(false);
            thermalPrinter.drawLine();
            thermalPrinter.alignLeft();
          }

          const timeOnly = date.includes(' ') ? date.split(' ')[1].substring(0, 5) : date;
          thermalPrinter.leftRight(`Tarih: ${timeOnly}`, `No: ${data.receiptNumber || '000000'}`);
          
          if (profile?.showWaiter !== false && data.cashierName) {
            thermalPrinter.println(`Kasiyer: ${trASCII(data.cashierName)}`);
          }
          thermalPrinter.drawLine();

          thermalPrinter.leftRight('Urun', 'Tutar');
          thermalPrinter.drawLine();

          const activeItems = data.items.filter((i: any) => !i.status || i.status === 'ACTIVE');
          const inactiveItems = data.items.filter((i: any) => i.status && i.status !== 'ACTIVE');

          for (const item of activeItems) {
            let portionStr = '';
            if (item.saleType === 'HALF') portionStr = ' (YARIM)';
            else if (item.saleType === 'DOUBLE') portionStr = ' (DUBLE)';
            
            const nameStr = `${item.quantity}x ${trASCII(item.name + portionStr).substring(0, 22)}`;
            const totalStr = `${Number(item.total).toFixed(2)} TL`;
            thermalPrinter.leftRight(nameStr, totalStr);

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
              if (item.saleType === 'HALF') portionStr = ' (YARIM)';
              else if (item.saleType === 'DOUBLE') portionStr = ' (DUBLE)';
              
              const statusLabel = item.status === 'REFUNDED' ? 'IADE' : 'IPTAL';
              const nameStr = `${item.quantity}x ${trASCII(item.name + portionStr).substring(0, 18)} [${statusLabel}]`;
              thermalPrinter.println(nameStr);
              const reason = item.refundReason || item.cancelReason || item.note;
              if (reason) thermalPrinter.println(`  Sebep: ${trASCII(reason)}`);
            }
          }

          thermalPrinter.drawLine();
          thermalPrinter.bold(true);
          thermalPrinter.leftRight('TOPLAM', `${Number(data.totalAmount).toFixed(2)} TL`);
          thermalPrinter.setTextNormal();
          thermalPrinter.bold(false);
          
          if (data.paymentMethod) {
            thermalPrinter.println(`Odeme: ${data.paymentMethod === 'CASH' ? 'NAKIT' : 'KREDI KARTI'}`);
          }

          // Döviz Kurları (Profilde açıksa)
          if (profile?.showExchangeRates) {
            try {
              const [eurStr, usdStr] = await Promise.all([
                this.parametersService.getValue('pos', 'eur_rate'),
                this.parametersService.getValue('pos', 'usd_rate')
              ]);
              const eurRate = Number(eurStr) || 37.50;
              const usdRate = Number(usdStr) || 35.20;
              
              thermalPrinter.drawLine();
              thermalPrinter.println(`EUR (${eurRate.toFixed(2)}) : E ${(Number(data.totalAmount) / eurRate).toFixed(2)}`);
              thermalPrinter.println(`USD (${usdRate.toFixed(2)}) : $ ${(Number(data.totalAmount) / usdRate).toFixed(2)}`);
            } catch (e) {}
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
                if (data.tableName && profile.showTable !== false) {
                  thermalPrinter.alignCenter();
                  thermalPrinter.bold(true);
                  const tableTw = Math.max(0, tw === 0 ? 1 : tw);
                  const tableTh = Math.max(0, th === 0 ? 1 : th);
                  thermalPrinter.setTextSize(tableTw, tableTh);
                  thermalPrinter.println(trASCII(data.tableName));
                  const resetTw = Math.max(0, tw - 1);
                  const resetTh = Math.max(0, th - 1);
                  thermalPrinter.setTextSize(resetTw, resetTh);
                  thermalPrinter.bold(false);
                  thermalPrinter.drawLine();
                  thermalPrinter.alignLeft();
                }

                const timeOnly = date.includes(' ') ? date.split(' ')[1].substring(0, 5) : date;
                thermalPrinter.leftRight(`Tarih: ${timeOnly}`, `No: ${data.receiptNumber || '000000'}`);
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
                  
                  if (profile.showPrice) {
                    // Müşteri fişi formatı (fiyat gösterimli)
                    const totalStr = `${Number(item.total || item.price * item.quantity).toFixed(2)} TL`;
                    thermalPrinter.leftRight(`${item.quantity}x ${trASCII(item.name).substring(0,20)}`, totalStr);
                  } else {
                    // Normal mutfak formatı (Bitişik gösterim)
                    thermalPrinter.println(`${item.quantity}x ${trASCII(item.name).substring(0,28)}`);
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
                    if (profile.showPrice) {
                      const totalStr = `${Number(item.total || item.price * item.quantity).toFixed(2)} TL`;
                      thermalPrinter.leftRight(`${item.quantity}x ${trASCII(item.name).substring(0,20)}`, totalStr);
                    } else {
                      thermalPrinter.println(`${item.quantity}x ${trASCII(item.name).substring(0,28)}`);
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
                     thermalPrinter.println(`${item.quantity}x IPTAL ${trASCII(item.name).substring(0,20)}`);
                     thermalPrinter.bold(false);
                     const reason = item.refundReason || item.cancelReason || item.note;
              if (reason) thermalPrinter.println(`  Sebep: ${trASCII(reason)}`);
                   }
                }

                // Döviz Kurları ve Genel Toplam (Sadece Müşteri Fişi İçin)
                if (profile.infoOnly && profile.showPrice) {
                  // Siparişin genel toplamını hesapla (sadece iptal edilmeyenler)
                  const totalAmount = group.items
                    .filter((i: any) => !i.isCancelled)
                    .reduce((sum: number, i: any) => sum + (Number(i.total) || Number(i.price) * Number(i.quantity)), 0);

                  thermalPrinter.drawLine();
                  thermalPrinter.bold(true);
                  thermalPrinter.setTextSize(tw, th);
                  thermalPrinter.leftRight('TOPLAM', `${totalAmount.toFixed(2)} TL`);
                  thermalPrinter.bold(false);
                  thermalPrinter.setTextNormal();

                  // Döviz Kurlarını Çek ve Yazdır
                  try {
                    const [eurStr, usdStr, gbpStr] = await Promise.all([
                      this.parametersService.getValue('pos', 'eur_rate'),
                      this.parametersService.getValue('pos', 'usd_rate'),
                      this.parametersService.getValue('pos', 'gbp_rate')
                    ]);

                    const eurRate = Number(eurStr) || 37.50;
                    const usdRate = Number(usdStr) || 35.20;
                    const gbpRate = Number(gbpStr) || 44.10;

                    thermalPrinter.drawLine();
                    thermalPrinter.println(`EUR (${eurRate.toFixed(2)}) : E ${(totalAmount / eurRate).toFixed(2)}`);
                    thermalPrinter.println(`USD (${usdRate.toFixed(2)}) : $ ${(totalAmount / usdRate).toFixed(2)}`);
                    thermalPrinter.println(`GBP (${gbpRate.toFixed(2)}) : P ${(totalAmount / gbpRate).toFixed(2)}`);
                  } catch (err) {
                    console.warn('Döviz kurlari alinamadi, atlaniliyor.', err);
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
          thermalPrinter.leftRight('IADE TOPLAM', `${Number(data.refundTotal || 0).toFixed(2)} TL`);
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

      // 2. Detaylı Ürün Satışlarını Çek
      const shifts = await this.dataSource.query(`SELECT id FROM shifts WHERE businessDate = @0 AND cashRegisterId = @1`, [zReport.businessDate, zReport.cashRegisterId]);
      const shiftIds = shifts.map((s: any) => s.id).join(',');
      
      let productSales = [];
      if (shiftIds) {
        productSales = await this.dataSource.query(`
          SELECT si.name, SUM(CAST(si.quantity AS DECIMAL(12,2))) as quantity, SUM(CAST(si.total AS DECIMAL(12,2))) as total
          FROM sale_items si JOIN sales s ON s.id = si.saleId
          WHERE s.shiftId IN (${shiftIds}) AND s.status = 'COMPLETED' AND si.status = 'ACTIVE'
          GROUP BY si.name
          ORDER BY total DESC
        `);
      }

      // JSON alanları parse et
      const data = {
        ...zReport,
        userName,
        cashRegisterName,
        productSales,
        categoryTotals: typeof zReport.categoryTotals === 'string' ? JSON.parse(zReport.categoryTotals) : zReport.categoryTotals,
        paymentTotals: typeof zReport.paymentTotals === 'string' ? JSON.parse(zReport.paymentTotals) : zReport.paymentTotals,
        waiterSales: typeof zReport.waiterSales === 'string' ? JSON.parse(zReport.waiterSales) : zReport.waiterSales,
      };

      // 3. Yazdır
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
        if (!isConnected) throw new Error('Yazıcıya bağlanılamadı.');
      }

      // Header
      thermalPrinter.alignCenter();
      thermalPrinter.bold(true);
      thermalPrinter.println('*** POSNETX ***');
      thermalPrinter.setTextSize(1, 1);
      thermalPrinter.println('GUN SONU RAPORU');
      thermalPrinter.setTextNormal();
      thermalPrinter.bold(false);
      thermalPrinter.drawLine();

      // Info
      thermalPrinter.alignLeft();
      thermalPrinter.println(`Z No: ${data.zNumber || '---'}`);
      thermalPrinter.println(`Tarih: ${new Date(data.businessDate).toLocaleDateString('tr-TR')}`);
      thermalPrinter.println(`Kasa: ${trASCII(data.cashRegisterName)}`);
      thermalPrinter.println(`Kullanici: ${trASCII(data.userName)}`);
      thermalPrinter.drawLine();

      // Category Totals
      if (data.categoryTotals && data.categoryTotals.length > 0) {
        thermalPrinter.alignCenter();
        thermalPrinter.bold(true);
        thermalPrinter.println('--- GRUP BAZLI SATISLAR ---');
        thermalPrinter.bold(false);
        thermalPrinter.alignLeft();
        for (const cat of data.categoryTotals) {
          thermalPrinter.leftRight(trASCII(cat.name || 'Diger'), `${Number(cat.total).toFixed(2)} TL`);
        }
        thermalPrinter.drawLine();
      }

      // Product Totals
      if (data.productSales && data.productSales.length > 0) {
        thermalPrinter.alignCenter();
        thermalPrinter.bold(true);
        thermalPrinter.println('--- URUN BAZLI SATISLAR ---');
        thermalPrinter.bold(false);
        thermalPrinter.alignLeft();
        for (const p of data.productSales) {
          thermalPrinter.leftRight(`${Number(p.quantity).toFixed(0)}x ${trASCII(p.name).substring(0, 18)}`, `${Number(p.total).toFixed(2)} TL`);
        }
        thermalPrinter.drawLine();
      }

      // Financial Summary
      thermalPrinter.alignCenter();
      thermalPrinter.bold(true);
      thermalPrinter.println('--- ODEME TOPLAMLARI ---');
      thermalPrinter.bold(false);
      thermalPrinter.alignLeft();
      if (data.paymentTotals) {
        for (const pt of data.paymentTotals) {
          thermalPrinter.leftRight(trASCII(pt.method === 'CASH' ? 'NAKIT' : pt.method === 'CREDIT_CARD' ? 'KREDI KARTI' : pt.method), `${Number(pt.total).toFixed(2)} TL`);
        }
      }
      thermalPrinter.drawLine();

      // Stats
      thermalPrinter.leftRight('TOPLAM FIS', `${data.totalReceipts || 0}`);
      thermalPrinter.leftRight('URUN ADEDI', `${data.totalProductCount || 0}`);
      thermalPrinter.leftRight('IPTAL TOPLAM', `${Number(data.cancelTotal || 0).toFixed(2)} TL`);
      thermalPrinter.leftRight('IADE TOPLAM', `${Number(data.refundTotal || 0).toFixed(2)} TL`);
      thermalPrinter.drawLine();

      // Grand Total
      thermalPrinter.bold(true);
      thermalPrinter.setTextSize(1, 1);
      thermalPrinter.leftRight('GENEL TOPLAM', `${Number(data.netSales).toFixed(2)} TL`);
      thermalPrinter.setTextNormal();
      thermalPrinter.bold(false);
      thermalPrinter.drawLine();

      thermalPrinter.alignCenter();
      thermalPrinter.println('Mali Degeri Yoktur');
      thermalPrinter.cut();
      await thermalPrinter.execute();

      return { success: true, message: 'Detayli gun sonu raporu yazdirildi.' };
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
        osPrinters = list.map((p: any) => ({
          name: p.deviceId || p.name || typeof p === 'string' ? p : 'Bilinmeyen Yazıcı',
          port: p.port || p.portName || '',
          isDefault: p.isDefault || false
        }));
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
            const printersArr = Array.isArray(parsed) ? parsed : [parsed];
            osPrinters = printersArr.map((p: any) => ({
              name: p.Name,
              port: p.PortName,
              shared: p.Shared
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
