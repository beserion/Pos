import { Repository } from 'typeorm';
import { Delivery } from './delivery.entity';
export declare class DeliveriesService {
    private deliveryRepository;
    constructor(deliveryRepository: Repository<Delivery>);
    findAll(): Promise<Delivery[]>;
    findOne(id: number): Promise<Delivery>;
    create(deliveryData: Partial<Delivery>): Promise<Delivery>;
    update(id: number, updateData: Partial<Delivery>): Promise<Delivery>;
    updateLocation(id: number, lat: number, lng: number): Promise<Delivery>;
    findByCourier(courierId: number): Promise<Delivery[]>;
    findHistoryByCourier(courierId: number): Promise<Delivery[]>;
    remove(id: number): Promise<void>;
}
