import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Printer } from './printer.entity';

@Injectable()
export class PrintersService {
  constructor(
    @InjectRepository(Printer)
    private readonly printerRepository: Repository<Printer>,
  ) {}

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
}
