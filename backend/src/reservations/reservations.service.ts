import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from './reservation.entity';
import { TablesService } from '../tables/tables.service';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    private tablesService: TablesService,
  ) {}

  async findAll(): Promise<Reservation[]> {
    return await this.reservationRepository.find({
      relations: ['table', 'table.zone', 'location'],
      order: { reservationTime: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['table', 'table.zone', 'location'],
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }
    return reservation;
  }

  async create(reservationData: any): Promise<Reservation> {
    const { id, ...data } = reservationData;
    const newReservation = this.reservationRepository.create({
      ...data,
      table: reservationData.tableId ? { id: reservationData.tableId } : null,
      location: reservationData.locationId
        ? { id: reservationData.locationId }
        : null,
    });
    return await this.reservationRepository.save(newReservation as any);
  }

  async update(id: number, updateData: any): Promise<Reservation> {
    const reservation = await this.findOne(id);

    if (updateData.status === 'ARRIVED' && reservation.table) {
      await this.tablesService.update(reservation.table.id, { status: 'DOLU' });
    } else if (
      updateData.status === 'CONFIRMED' &&
      (updateData.tableId || updateData.table?.id)
    ) {
      const tableId = updateData.tableId || updateData.table?.id;
      await this.tablesService.update(tableId, { status: 'REZERVE' });
    }

    const updatedReservation = {
      ...reservation,
      ...updateData,
      table: updateData.tableId
        ? { id: updateData.tableId }
        : updateData.table || reservation.table,
      location: updateData.locationId
        ? { id: updateData.locationId }
        : updateData.location || reservation.location,
    };

    return await this.reservationRepository.save(updatedReservation);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.reservationRepository.delete(id);
  }
}
