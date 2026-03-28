import { NestFactory } from '@nestjs/core';
import { AppModule } from '../backend/src/app.module';
import { ProductsService } from '../backend/src/products/products.service';

async function bootstrap() {
    try {
        const app = await NestFactory.createApplicationContext(AppModule);
        const productsService = app.get(ProductsService);
        const products = await productsService.findAll();
        console.log('Successfully fetched products:', products.length);
        await app.close();
    } catch (e: any) {
        console.error('INTERNAL ERROR:', e.message);
        if (e.stack) console.error(e.stack);
        process.exit(1);
    }
}
bootstrap();
