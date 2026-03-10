import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Printer } from './printer.entity';

@Injectable()
export class PrintersService {
  constructor(
    @InjectRepository(Printer)
    private readonly printerRepository: Repository<Printer>,
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

      const thermalPrinter = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: `tcp://${printer.ipAddress}`,
        characterSet: CharacterSet.PC857_TURKISH,
        removeSpecialCharacters: false,
        lineCharacter: '=',
        breakLine: BreakLine.WORD,
        options: {
          timeout: 5000,
        },
      });

      const isConnected = await thermalPrinter.isPrinterConnected();
      if (!isConnected) {
        return {
          success: false,
          message: `Yazıcıya bağlanılamadı: ${printer.ipAddress}`,
        };
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

      // Group items by their printer's location
      const locationGroups: { [location: string]: any[] } = {};

      for (const item of itemsToPrint) {
        if (!item.printerId) continue;

        // Resolve the printer from DB to get its location
        const originalPrinter = await this.printerRepository.findOne({
          where: { id: item.printerId },
        });

        if (originalPrinter && originalPrinter.location) {
          const loc = originalPrinter.location;
          if (!locationGroups[loc]) {
            locationGroups[loc] = [];
          }
          locationGroups[loc].push(item);
        } else if (originalPrinter) {
          // If printer has no location defined, group by its ID just in case
          const fallbackLoc = `PRINTER_${originalPrinter.id}`;
          if (!locationGroups[fallbackLoc]) {
            locationGroups[fallbackLoc] = [];
          }
          locationGroups[fallbackLoc].push(item);
        }
      }

      const activeLocations = Object.keys(locationGroups);
      if (activeLocations.length === 0) {
        return {
          success: false,
          message: 'Ürünlere tanımlı geçerli yazıcı konumu bulunamadı.',
        };
      }

      const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } =
        await import('node-thermal-printer');

      for (const loc of activeLocations) {
        let targetPrinter;

        if (loc.startsWith('PRINTER_')) {
          const pid = parseInt(loc.replace('PRINTER_', ''), 10);
          targetPrinter = await this.printerRepository.findOne({
            where: { id: pid, isActive: true },
          });
        } else {
          // Find any active printer for this location
          targetPrinter = await this.printerRepository.findOne({
            where: { location: loc, isActive: true },
          });
        }

        if (!targetPrinter || !targetPrinter.ipAddress) {
          console.warn(
            `Aktif yazıcı bulunamadı veya IP adresi yok. Konum/ID: ${loc}`,
          );
          continue;
        }

        const items = locationGroups[loc];

        try {
          const thermalPrinter = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            interface: `tcp://${targetPrinter.ipAddress}`,
            characterSet: CharacterSet.PC857_TURKISH,
            removeSpecialCharacters: false,
            lineCharacter: '=',
            breakLine: BreakLine.WORD,
            options: {
              timeout: 5000,
            },
          });

          const isConnected = await thermalPrinter.isPrinterConnected();
          if (!isConnected) {
            console.error(`Yazıcıya bağlanılamadı: ${targetPrinter.ipAddress}`);
            continue;
          }

          thermalPrinter.alignCenter();
          thermalPrinter.bold(true);
          thermalPrinter.setTextSize(2, 2);

          let ticketTitle = data.orderType || 'MUTFAK SIPARISI';
          if (!loc.startsWith('PRINTER_')) {
            ticketTitle = `${loc.toUpperCase()} SIPARISI`;
          }

          thermalPrinter.println(ticketTitle);
          thermalPrinter.setTextNormal();
          thermalPrinter.bold(false);
          thermalPrinter.drawLine();

          thermalPrinter.alignLeft();
          const date = new Date(data.date || new Date()).toLocaleString(
            'tr-TR',
          );
          thermalPrinter.println(`Tarih: ${date}`);
          thermalPrinter.println(
            `Sipariş No: ${data.receiptNumber || '000000'}`,
          );
          thermalPrinter.drawLine();

          thermalPrinter.leftRight('Adet', 'Urun');
          thermalPrinter.drawLine();

          for (const item of items) {
            const nameStr = item.name.substring(0, 30);
            thermalPrinter.bold(true);
            thermalPrinter.setTextSize(1, 1);
            thermalPrinter.leftRight(`${item.quantity}x`, nameStr);
            thermalPrinter.setTextNormal();
            thermalPrinter.bold(false);
            if (item.note) {
              thermalPrinter.println(`Not: ${item.note}`);
            }
          }

          thermalPrinter.drawLine();
          thermalPrinter.cut();
          thermalPrinter.beep();

          await thermalPrinter.execute();
          thermalPrinter.clear();
        } catch (printErr: any) {
          console.error(`Printer ${targetPrinter.name} hatası:`, printErr);
        }
      }

      return {
        success: true,
        message: 'Bölüm/Konum bazlı fişler yazdırıldı',
      };
    } catch (error: any) {
      console.error('Mutfak Yazıcı Hatası:', error);
      return { success: false, message: `Yazıcı hatası: ${error.message}` };
    }
  }
}
