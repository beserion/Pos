import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
      const cashRegister = await this.cashRegisterRepository.findOne({
        where: { id: data.cashRegisterId },
        relations: ['receiptPrinter'],
      });
      if (cashRegister && cashRegister.receiptPrinter) {
        printer = cashRegister.receiptPrinter;
      }
    }

    if (!printer) {
      // Fallback: If no cashRegisterId provided or no printer attached,
      // fallback to standard 'kasa' lookup (for backwards compatibility).
      printer = await this.printerRepository
        .createQueryBuilder('printer')
        .where('LOWER(printer.name) = :name', { name: 'kasa' })
        .andWhere('printer.isActive = :isActive', { isActive: true })
        .getOne() as Printer | null;
    }

    if (!printer || !printer.ipAddress) {
      console.warn(
        'Bağlı bir fis yazıcısı bulunamadı veya IP adresi eksik. Sadece tarayıcıdan yazdırma yapılabilir.',
      );
      return {
        success: false,
        message: 'Fiş yazdırılamadı: Geçerli kasa/yazıcı bulunamadı.',
      };
    }

    try {
      // Dynamic import because node-thermal-printer might need it
      const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } =
        await import('node-thermal-printer');

      // Resolve printer interface
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
        options: {
          timeout: 5000,
        },
      });

      // Skip connectivity check for local printers as it's often unreliable 
      // with standard drivers. For TCP, we still check.
      if (printerInterface.startsWith('tcp://')) {
        const isConnected = await thermalPrinter.isPrinterConnected();
        if (!isConnected) {
          return {
            success: false,
            message: `Ag yazıcısına bağlanılamadı: ${printer.ipAddress}`,
          };
        }
      }

      thermalPrinter.alignCenter();
      thermalPrinter.bold(true);
      thermalPrinter.setTextSize(1, 1);
      thermalPrinter.println(trASCII(data.companyName || 'ANTIGRAVITY POS'));
      thermalPrinter.setTextNormal();
      thermalPrinter.bold(false);
      thermalPrinter.println('Tesekkur Ederiz');
      thermalPrinter.drawLine();

      thermalPrinter.alignLeft();
      const date = new Date(data.date || new Date()).toLocaleString('tr-TR');
      thermalPrinter.println(`Tarih: ${date}`);
      thermalPrinter.println(`Fis No: ${data.receiptNumber || '000000'}`);
      if (data.tableName) thermalPrinter.println(`Masa: ${trASCII(data.tableName)}`);
      thermalPrinter.println(`Kasiyer: ${trASCII(data.cashierName || 'Kasiyer')}`);
      thermalPrinter.drawLine();

      thermalPrinter.leftRight('Urun', 'Tutar');
      thermalPrinter.drawLine();

      for (const item of data.items) {
        const nameStr = `${item.quantity}x ${trASCII(item.name).substring(0, 20)}`;
        const totalStr = `${Number(item.total).toFixed(2)} TL`;
        thermalPrinter.leftRight(nameStr, totalStr);

        if (item.subItems && item.subItems.length > 0) {
          for (const sub of item.subItems) {
            const subName = trASCII(sub.product?.name || sub.name || `Urun #${sub.productId}`);
            thermalPrinter.println(`  + ${subName}`);
          }
        }
      }

      thermalPrinter.drawLine();
      thermalPrinter.bold(true);
      thermalPrinter.setTextSize(1, 1);
      thermalPrinter.leftRight(
        'TOPLAM',
        `${Number(data.totalAmount).toFixed(2)} TL`,
      );
      thermalPrinter.setTextNormal();
      thermalPrinter.bold(false);
      thermalPrinter.println(
        `Odeme: ${data.paymentMethod === 'CASH' ? 'NAKIT' : 'KREDI KARTI'}`,
      );
      thermalPrinter.drawLine();

      thermalPrinter.alignCenter();
      thermalPrinter.println('Mali Degeri Yoktur - Bilgi Fisidir');
      thermalPrinter.cut();
      thermalPrinter.beep();

      await thermalPrinter.execute();
      thermalPrinter.clear();

      return { success: true, message: 'Yazdırma başarılı' };
    } catch (error: any) {
      console.error('Yazıcı Hatası:', error);
      return { success: false, message: `Yazıcı hatası: ${error.message}` };
    }
  }
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
          if (!printer || !printer.isActive || !printer.ipAddress) continue;
          
          const copyCount = target.type === 'MAIN' ? (profile?.copyCount || 1) : 1;
          
          for (let c = 0; c < copyCount; c++) {
            try {
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

              let isConnected = true;
              if (printerInterface.startsWith('tcp://')) {
                isConnected = await thermalPrinter.isPrinterConnected();
              }

              if (isConnected) {
                // === BAŞLIK ===
                thermalPrinter.alignCenter();
                thermalPrinter.bold(true);
                
                // Font boyutu ayarı
                let tw = 1, th = 1;
                if (profile.textSize === 'LARGE') { tw = 2; th = 2; }
                else if (profile.textSize === 'XLARGE') { tw = 3; th = 3; }
                
                if (profile.showTitle !== false) {
                  thermalPrinter.setTextSize(tw, th);
                  let title = trASCII(data.orderType || 'MUTFAK SIPARISI');
                  if (target.type === 'INFO') title = 'BILGI FISI';
                  if (profile.infoOnly && profile.showPrice) title = 'ADISYON';
                  
                  thermalPrinter.println(title);
                  thermalPrinter.setTextNormal();
                  thermalPrinter.bold(false);
                  thermalPrinter.drawLine();
                }

                // === BİLGİ SATIRI ===
                thermalPrinter.alignLeft();
                thermalPrinter.setTextSize(tw === 1 ? 1 : tw - 1, th === 1 ? 1 : th - 1); // Bilgi satırı ana fonttan biraz küçük olabilir
                const date = new Date(data.date || new Date()).toLocaleString('tr-TR');

                // Masa adı — büyük ve belirgin
                if (data.tableName && profile.showTable !== false) {
                  thermalPrinter.alignCenter();
                  thermalPrinter.bold(true);
                  thermalPrinter.setTextSize(tw === 1 ? 2 : tw, th === 1 ? 2 : th);
                  thermalPrinter.println(trASCII(data.tableName));
                  thermalPrinter.setTextSize(tw === 1 ? 1 : tw - 1, th === 1 ? 1 : th - 1);
                  thermalPrinter.bold(false);
                  thermalPrinter.drawLine();
                  thermalPrinter.alignLeft();
                }

                thermalPrinter.println(`Tarih: ${date}`);
                thermalPrinter.println(`Siparis No: ${data.receiptNumber || '000000'}`);
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
                    // Normal mutfak formatı
                    thermalPrinter.leftRight(`${item.quantity}x`, trASCII(item.name).substring(0,28));
                  }
                  thermalPrinter.bold(false);
                  
                  if (profile.showPortion !== false) {
                    if (item.subItems && item.subItems.length > 0) {
                      for (const sub of item.subItems) {
                        const subName = trASCII(sub.product?.name || sub.name || `Urun #${sub.productId}`);
                        thermalPrinter.println(`  + ${subName}`);
                      }
                    }
                    if (item.note) thermalPrinter.println(`  Not: ${trASCII(item.note)}`);
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
                      thermalPrinter.leftRight(`${item.quantity}x`, trASCII(item.name).substring(0,28));
                    }
                    thermalPrinter.bold(false);

                    if (profile.showPortion !== false) {
                      if (item.subItems && item.subItems.length > 0) {
                        for (const sub of item.subItems) {
                          const subName = trASCII(sub.product?.name || sub.name || `Urun #${sub.productId}`);
                          thermalPrinter.println(`  + ${subName}`);
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
                     thermalPrinter.leftRight(`${item.quantity}x IPTAL`, trASCII(item.name).substring(0,20));
                     thermalPrinter.bold(false);
                     if (item.note) thermalPrinter.println(`  Sebep: ${trASCII(item.note)}`);
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
          // Logo printing would go here if we had a logo path
          // For now, just a placeholder or text
          thermalPrinter.println('*** POSNETX ***');
        }

        let tw = 1, th = 1;
        if (profile.textSize === 'LARGE') { tw = 2; th = 2; }
        else if (profile.textSize === 'XLARGE') { tw = 3; th = 3; }

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
        thermalPrinter.alignCenter();
        thermalPrinter.bold(true);
        thermalPrinter.println('--- SATIS TOPLAMLARI ---');
        thermalPrinter.bold(false);
        thermalPrinter.alignLeft();
        
        if (profile.groupByCategory && data.categoryTotals) {
          for (const cat of data.categoryTotals) {
            thermalPrinter.leftRight(trASCII(cat.name), `${Number(cat.total).toFixed(2)} TL`);
          }
        } else {
          thermalPrinter.leftRight('TOPLAM SATIS', `${Number(data.totalSales).toFixed(2)} TL`);
        }
        thermalPrinter.drawLine();

        // Payment Totals
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
