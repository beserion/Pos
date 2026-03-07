import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { PrintersService } from './printers.service';
import { Printer } from './printer.entity';

@Controller('printers')
export class PrintersController {
    constructor(private readonly printersService: PrintersService) { }

    @Get()
    findAll(): Promise<Printer[]> {
        return this.printersService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string): Promise<Printer> {
        return this.printersService.findOne(+id);
    }

    @Post()
    create(@Body() createData: Partial<Printer>): Promise<Printer> {
        return this.printersService.create(createData);
    }

    @Put(':id')
    update(
        @Param('id') id: string,
        @Body() updateData: Partial<Printer>,
    ): Promise<Printer> {
        return this.printersService.update(+id, updateData);
    }

    @Delete(':id')
    remove(@Param('id') id: string): Promise<void> {
        return this.printersService.remove(+id);
    }

    @Post('print-receipt')
    printReceipt(@Body() data: any): Promise<{ success: boolean; message: string }> {
        return this.printersService.printReceipt(data);
    }
}
