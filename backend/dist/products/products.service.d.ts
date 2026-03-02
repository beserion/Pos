import { Repository } from 'typeorm';
import { Product } from './product.entity';
export declare class ProductsService {
    private productRepository;
    constructor(productRepository: Repository<Product>);
    findAll(): Promise<Product[]>;
    findOne(id: number): Promise<Product>;
    create(productData: Partial<Product>): Promise<Product>;
    update(id: number, updateData: Partial<Product>): Promise<Product>;
    remove(id: number): Promise<void>;
}
