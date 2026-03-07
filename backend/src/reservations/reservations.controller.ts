import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { Reservation } from './reservation.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
    constructor(private readonly reservationsService: ReservationsService) { }

    @Get()
    async findAll(): Promise<Reservation[]> {
        return this.reservationsService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<Reservation> {
        return this.reservationsService.findOne(+id);
    }

    @Post()
    async create(@Body() reservationData: Partial<Reservation>): Promise<Reservation> {
        return this.reservationsService.create(reservationData);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() updateData: Partial<Reservation>): Promise<Reservation> {
        return this.reservationsService.update(+id, updateData);
    }

    @Delete(':id')
    async remove(@Param('id') id: string): Promise<void> {
        return this.reservationsService.remove(+id);
    }
}
