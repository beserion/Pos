export declare class Invoice {
    id: number;
    invoiceNumber: string;
    saleId: number;
    customerId: number;
    totalAmount: number;
    taxAmount: number;
    issueDate: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}
