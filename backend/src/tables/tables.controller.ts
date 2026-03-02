import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { TablesService } from './tables.service';
import { Table } from './table.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tables')
@UseGuards(JwtAuthGuard)
export class TablesController {
    constructor(private readonly tablesService: TablesService) { }

    @Get()
    findAll() {
        return this.tablesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.tablesService.findOne(+id);
    }

    @Post()
    create(@Body() tableData: Partial<Table>) {
        return this.tablesService.create(tableData);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updateData: Partial<Table>) {
        return this.tablesService.update(+id, updateData);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.tablesService.remove(+id);
    }
}
