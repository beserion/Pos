import { DeliveriesService } from './deliveries.service';
import { Delivery } from './delivery.entity';
export declare class DeliveriesController {
    private readonly deliveriesService;
    constructor(deliveriesService: DeliveriesService);
    findAll(): Promise<Delivery[]>;
    findOne(id: string): Promise<Delivery>;
    findByCourier(id: string): Promise<Delivery[]>;
    findHistoryByCourier(id: string): Promise<Delivery[]>;
    updateLocation(id: string, coords: {
        lat: number;
        lng: number;
    }): Promise<Delivery>;
    create(deliveryData: Partial<Delivery>): Promise<Delivery>;
    update(id: string, updateData: Partial<Delivery>): Promise<Delivery>;
    remove(id: string): Promise<void>;
}
