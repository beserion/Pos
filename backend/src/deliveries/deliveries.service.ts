import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delivery } from './delivery.entity';

@Injectable()
export class DeliveriesService {
    constructor(
        @InjectRepository(Delivery)
        private deliveryRepository: Repository<Delivery>,
    ) { }

    async findAll(): Promise<Delivery[]> {
        return await this.deliveryRepository.find();
    }

    async findOne(id: number): Promise<Delivery> {
        const delivery = await this.deliveryRepository.findOne({ where: { id } });
        if (!delivery) {
            throw new NotFoundException(`Delivery with ID ${id} not found`);
        }
        return delivery;
    }

    async create(deliveryData: Partial<Delivery>): Promise<Delivery> {
        const newDelivery = this.deliveryRepository.create(deliveryData);
        return await this.deliveryRepository.save(newDelivery);
    }

    async update(id: number, updateData: Partial<Delivery>): Promise<Delivery> {
        await this.findOne(id);
        await this.deliveryRepository.update(id, updateData);
        return this.findOne(id);
    }

    async updateLocation(id: number, lat: number, lng: number): Promise<Delivery> {
        await this.deliveryRepository.update(id, { currentLat: lat, currentLng: lng });
        return this.findOne(id);
    }

    async findByCourier(courierId: number): Promise<Delivery[]> {
        return await this.deliveryRepository.find({
            where: { courierId, status: 'IN_TRANSIT' }
        });
    }

    async findHistoryByCourier(courierId: number): Promise<Delivery[]> {
        return await this.deliveryRepository.find({
            where: { courierId },
            order: { createdAt: 'DESC' }
        });
    }

    async remove(id: number): Promise<void> {
        await this.findOne(id);
        await this.deliveryRepository.delete(id);
    }
}
