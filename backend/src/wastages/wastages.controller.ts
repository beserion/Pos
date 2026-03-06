import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WastagesService } from './wastages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Wastage } from './wastage.entity';

@Controller('wastages')
@UseGuards(JwtAuthGuard)
export class WastagesController {
    constructor(private readonly wastagesService: WastagesService) { }

    @Get()
    @Permissions('VIEW_WASTAGES')
    findAll() {
        return this.wastagesService.findAll();
    }

    @Get('summary')
    @Permissions('VIEW_WASTAGES')
    getWastageSummary(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.wastagesService.getWastageSummary(startDate, endDate);
    }

    @Get(':id')
    @Permissions('VIEW_WASTAGES')
    findOne(@Param('id') id: string) {
        return this.wastagesService.findOne(+id);
    }

    @Post()
    @Permissions('ADD_WASTAGES')
    create(@Body() wastageData: Partial<Wastage>) {
        return this.wastagesService.create(wastageData);
    }
}
