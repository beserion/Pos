import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Location } from './location.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
    constructor(private readonly locationsService: LocationsService) { }

    @Get()
    findAll() {
        return this.locationsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.locationsService.findOne(+id);
    }

    @Post()
    create(@Body() locationData: Partial<Location>) {
        return this.locationsService.create(locationData);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updateData: Partial<Location>) {
        return this.locationsService.update(+id, updateData);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.locationsService.remove(+id);
    }
}
