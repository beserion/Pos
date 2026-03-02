export declare class Delivery {
    id: number;
    saleId: number;
    courierId: number;
    status: string;
    deliveryAddress: string;
    currentLat: number;
    currentLng: number;
    customerPhone: string;
    notes: string;
    estimatedDeliveryTime: Date;
    actualDeliveryTime: Date;
    createdAt: Date;
    updatedAt: Date;
}
