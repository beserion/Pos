import { Controller, Get } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('public/products')
export class ProductsPublicController {
    constructor(private readonly productsService: ProductsService) { }

    @Get()
    async findAll() {
        // Only fetch what's necessary for the public menu, maybe filter by active
        return this.productsService.findAll();
    }
}
