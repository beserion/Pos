import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { Recipe } from '../recipes/recipe.entity';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private productRepository: Repository<Product>,
        @InjectRepository(Recipe)
        private recipeRepository: Repository<Recipe>,
    ) { }

    async findAll(): Promise<Product[]> {
        return await this.productRepository.find({
            relations: ['recipes', 'printer'],
        });
    }

    async findOne(id: number): Promise<Product> {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: ['recipes', 'printer'],
        });
        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }
        return product;
    }

    async create(
        productData: Partial<Product> & { recipes?: Partial<Recipe>[] },
    ): Promise<Product> {
        const { recipes, ...data } = productData;
        const newProduct = this.productRepository.create(data);
        const savedProduct = await this.productRepository.save(newProduct);

        if (recipes && recipes.length > 0) {
            const recipesToSave = recipes.map((recipe: any) => ({
                ingredientId: recipe.ingredientId,
                quantity: recipe.quantity,
                unit: recipe.unit,
                productId: savedProduct.id,
            }));
            await this.recipeRepository.save(recipesToSave);
        }

        return savedProduct;
    }

    async update(
        id: number,
        updateData: Partial<Product> & { recipes?: Partial<Recipe>[] },
    ): Promise<Product> {
        const product = await this.findOne(id);
        const { id: _, recipes, ...data } = updateData as any;
        this.productRepository.merge(product, data);
        const savedProduct = await this.productRepository.save(product);

        if (recipes !== undefined) {
            // Delete existing recipes for this product
            await this.recipeRepository.delete({ productId: id });

            if (recipes.length > 0) {
                const recipesToSave = recipes.map((recipe: any) => ({
                    ingredientId: recipe.ingredientId,
                    quantity: recipe.quantity,
                    unit: recipe.unit,
                    productId: id,
                }));
                await this.recipeRepository.save(recipesToSave);
            }
        }

        return savedProduct;
    }

    async remove(id: number): Promise<void> {
        await this.findOne(id);
        await this.productRepository.delete(id);
    }
}
