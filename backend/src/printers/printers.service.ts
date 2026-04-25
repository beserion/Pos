import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Printer } from './printer.entity';
import { CashRegister } from '../cash-registers/cash-register.entity';
import { OrderRoutingService } from '../order-routing/order-routing.service';

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
        const mapping = group.zoneMapping;
        if (!profile && !mapping) continue;

        const targetPrinters = [];
        
        if (mapping) {
          if (mapping.printer1) targetPrinters.push({ printer: mapping.printer1, type: 'MAIN', profileName: 'Zone Ana Yazıcı' });
          if (mapping.printer2) targetPrinters.push({ printer: mapping.printer2, type: 'INFO', profileName: 'Zone Bilgi 1' });
          if (mapping.printer3) targetPrinters.push({ printer: mapping.printer3, type: 'INFO', profileName: 'Zone Bilgi 2' });
        } else if (profile) {
          if (profile.mainPrinter) targetPrinters.push({ printer: profile.mainPrinter, type: 'MAIN', profileName: profile.name });
          if (profile.infoPrinter) targetPrinters.push({ printer: profile.infoPrinter, type: 'INFO', profileName: profile.name });
        }

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
                thermalPrinter.setTextSize(1, 1);
                
                let title = trASCII(data.orderType || 'MUTFAK SIPARISI');
                if (target.type === 'INFO') title = 'BILGI FISI';
                
                thermalPrinter.println(title);
                thermalPrinter.setTextNormal();
                thermalPrinter.bold(false);
                thermalPrinter.drawLine();

                // === BİLGİ SATIRI ===
                thermalPrinter.alignLeft();
                const date = new Date(data.date || new Date()).toLocaleString('tr-TR');

                // Masa adı — büyük ve belirgin
                if (data.tableName) {
                  thermalPrinter.alignCenter();
                  thermalPrinter.bold(true);
                  thermalPrinter.setTextSize(2, 2);
                  thermalPrinter.println(trASCII(data.tableName));
                  thermalPrinter.setTextNormal();
                  thermalPrinter.bold(false);
                  thermalPrinter.drawLine();
                  thermalPrinter.alignLeft();
                }

                thermalPrinter.println(`Tarih: ${date}`);
                thermalPrinter.println(`Siparis No: ${data.receiptNumber || '000000'}`);
                if (data.waiterName) {
                  thermalPrinter.bold(true);
                  thermalPrinter.println(`Garson: ${trASCII(data.waiterName)}`);
                  thermalPrinter.bold(false);
                }
                if (target.type === 'MAIN') {
                  thermalPrinter.println(`Profil: ${trASCII(target.profileName)}`);
                }
                thermalPrinter.drawLine();


                // === ÜRÜN LİSTESİ ===
                const immediateItems = group.items.filter((i: any) => !i.isWaiting);
                const waitingItems = group.items.filter((i: any) => i.isWaiting);

                for (const item of immediateItems) {
                  thermalPrinter.bold(true);
                  thermalPrinter.leftRight(`${item.quantity}x`, trASCII(item.name).substring(0,28));
                  thermalPrinter.bold(false);
                  
                  if (item.subItems && item.subItems.length > 0) {
                    for (const sub of item.subItems) {
                      const subName = trASCII(sub.product?.name || sub.name || `Urun #${sub.productId}`);
                      thermalPrinter.println(`  + ${subName}`);
                    }
                  }

                  if (item.note) thermalPrinter.println(`  Not: ${trASCII(item.note)}`);
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
                    thermalPrinter.leftRight(`${item.quantity}x`, trASCII(item.name).substring(0,28));
                    thermalPrinter.bold(false);

                    if (item.subItems && item.subItems.length > 0) {
                      for (const sub of item.subItems) {
                        const subName = trASCII(sub.product?.name || sub.name || `Urun #${sub.productId}`);
                        thermalPrinter.println(`  + ${subName}`);
                      }
                    }

                    if (item.note) thermalPrinter.println(`  Not: ${trASCII(item.note)}`);
                  }
                }

                if (c > 0) {
                  thermalPrinter.drawLine();
                  thermalPrinter.alignCenter();
                  thermalPrinter.println(`*** KOPYA ${c + 1} ***`);
                }

                thermalPrinter.drawLine();
                thermalPrinter.cut();
                thermalPrinter.beep();
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
