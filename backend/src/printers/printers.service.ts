import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Printer } from './printer.entity';
import { OrderRoutingService } from '../order-routing/order-routing.service';

@Injectable()
export class PrintersService {
  constructor(
    @InjectRepository(Printer)
    private readonly printerRepository: Repository<Printer>,
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
    // Try to find the printer named "Kasa"
    const printer = await this.printerRepository
      .createQueryBuilder('printer')
      .where('LOWER(printer.name) = :name', { name: 'kasa' })
      .andWhere('printer.isActive = :isActive', { isActive: true })
      .getOne();

    if (!printer || !printer.ipAddress) {
      console.warn(
        'Aktif "Kasa" isimli yazıcı veya IP adresi bulunamadı. Sadece tarayıcıdan yazdırma yapılabilir.',
      );
      return {
        success: false,
        message: 'Aktif "Kasa" yazıcısı veya IP adresi bulunamadı.',
      };
    }

    try {
      // Dynamic import because node-thermal-printer might need it
      const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } =
        await import('node-thermal-printer');

      let printerInterface = `tcp://${printer.ipAddress}`;
      
      // If ipAddress doesn't look like an IP (e.g., no dots or starts with printer:), 
      // treat it as a local printer name
      if (printer.ipAddress && !printer.ipAddress.includes('.') && !printer.ipAddress.startsWith('tcp://')) {
        printerInterface = `printer:${printer.ipAddress}`;
      } else if (printer.ipAddress.startsWith('printer:')) {
        printerInterface = printer.ipAddress;
      }

      const thermalPrinter = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: printerInterface,
        characterSet: CharacterSet.PC857_TURKISH,
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
      thermalPrinter.println(data.companyName || 'ANTIGRAVITY POS');
      thermalPrinter.setTextNormal();
      thermalPrinter.bold(false);
      thermalPrinter.println('Tesekkur Ederiz');
      thermalPrinter.drawLine();

      thermalPrinter.alignLeft();
      const date = new Date(data.date || new Date()).toLocaleString('tr-TR');
      thermalPrinter.println(`Tarih: ${date}`);
      thermalPrinter.println(`Fis No: ${data.receiptNumber || '000000'}`);
      thermalPrinter.println(`Kasiyer: ${data.cashierName || 'Kasiyer'}`);
      thermalPrinter.drawLine();

      thermalPrinter.leftRight('Urun', 'Tutar');
      thermalPrinter.drawLine();

      for (const item of data.items) {
        const nameStr = `${item.quantity}x ${item.name.substring(0, 20)}`;
        const totalStr = `${Number(item.total).toFixed(2)} TL`;
        thermalPrinter.leftRight(nameStr, totalStr);
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
      if (itemsToPrint.length === 0) {
        return { success: false, message: 'Yazdırılacak ürün bulunamadı.' };
      }

      // Yeni Nesil Yönlendirme Algoritması Devreye Giriyor
      const routedGroups = await this.orderRoutingService.routeOrderItems(itemsToPrint);
      
      const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } =
        await import('node-thermal-printer');

      let printCount = 0;

      for (const group of routedGroups) {
        const profile = group.profile;
        if (!profile) continue;

        const targetPrinters = [];
        if (profile.mainPrinter) targetPrinters.push({ printer: profile.mainPrinter, type: 'MAIN' });
        if (profile.infoPrinter) targetPrinters.push({ printer: profile.infoPrinter, type: 'INFO' });

        for (const target of targetPrinters) {
          const printer = target.printer;
          if (!printer || !printer.isActive || !printer.ipAddress) continue;
          
          const copyCount = target.type === 'MAIN' ? (profile.copyCount || 1) : 1;
          
          for (let c = 0; c < copyCount; c++) {
            try {
              const thermalPrinter = new ThermalPrinter({
                type: PrinterTypes.EPSON,
                interface: `tcp://${printer.ipAddress}`,
                characterSet: CharacterSet.PC857_TURKISH,
                removeSpecialCharacters: false,
                lineCharacter: '=',
                breakLine: BreakLine.WORD,
                options: { timeout: 5000 },
              });

              if (await thermalPrinter.isPrinterConnected()) {
                thermalPrinter.alignCenter();
                thermalPrinter.bold(true);
                thermalPrinter.setTextSize(2, 2);
                
                let title = data.orderType || 'MUTFAK SIPARISI';
                if (target.type === 'INFO') title = 'BILGI FISI';
                
                thermalPrinter.println(title);
                thermalPrinter.setTextNormal();
                thermalPrinter.bold(false);
                thermalPrinter.drawLine();

                thermalPrinter.alignLeft();
                const date = new Date(data.date || new Date()).toLocaleString('tr-TR');
                thermalPrinter.println(`Tarih: ${date}`);
                thermalPrinter.println(`Sipariş No: ${data.receiptNumber || '000000'}`);
                if (target.type === 'MAIN') {
                  thermalPrinter.println(`Cikti Profili: ${profile.name}`);
                }
                thermalPrinter.drawLine();
                thermalPrinter.leftRight('Adet', 'Urun');
                thermalPrinter.drawLine();

                const immediateItems = group.items.filter((i: any) => !i.isWaiting);
                const waitingItems = group.items.filter((i: any) => i.isWaiting);

                for (const item of immediateItems) {
                  thermalPrinter.bold(true);
                  if (target.type === 'MAIN') thermalPrinter.setTextSize(1, 1);
                  thermalPrinter.leftRight(`${item.quantity}x`, item.name.substring(0,30));
                  thermalPrinter.setTextNormal();
                  thermalPrinter.bold(false);
                  if (item.note) thermalPrinter.println(`Not: ${item.note}`);
                }

                if (waitingItems.length > 0) {
                  thermalPrinter.drawLine();
                  thermalPrinter.alignCenter();
                  thermalPrinter.println('--- BEKLEYENLER ---');
                  thermalPrinter.alignLeft();
                  thermalPrinter.drawLine();
                  for (const item of waitingItems) {
                    thermalPrinter.bold(true);
                    thermalPrinter.leftRight(`${item.quantity}x`, item.name.substring(0,30));
                    thermalPrinter.bold(false);
                    if (item.note) thermalPrinter.println(`Not: ${item.note}`);
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

      const thermalPrinter = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: `tcp://${targetPrinter.ipAddress}`,
        characterSet: CharacterSet.PC857_TURKISH,
        removeSpecialCharacters: false,
        lineCharacter: '=',
        breakLine: BreakLine.WORD,
        options: { timeout: 5000 },
      });

      const isConnected = await thermalPrinter.isPrinterConnected();
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
}
