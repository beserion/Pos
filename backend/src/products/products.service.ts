import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { Recipe } from '../recipes/recipe.entity';
import { Modifier } from '../modifiers/modifier.entity';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private productRepository: Repository<Product>,
        @InjectRepository(Recipe)
        private recipeRepository: Repository<Recipe>,
        @InjectRepository(Modifier)
        private modifierRepository: Repository<Modifier>,
    ) { }

    async countProducts(): Promise<number> {
        return await this.productRepository.count();
    }

    async findAll(): Promise<Product[]> {
        const products = await this.productRepository.find({
            relations: ['recipes', 'printer'],
        });

        if (products.length > 0) {
            const rawModifiers = await this.productRepository.query(`
                SELECT pm.productsId as productId, m.*
                FROM product_modifiers pm
                JOIN modifiers m ON m.id = pm.modifiersId
            `);

            products.forEach(p => {
                const mods = rawModifiers.filter((m: any) => m.productId === p.id);
                p.modifiers = mods.map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    groupName: m.groupName,
                    createdAt: m.createdAt,
                    updatedAt: m.updatedAt
                }));
            });
        }
        return products;
    }

    async findAllQuickSale(): Promise<Product[]> {
        // Fast, lightweight fetch without joining recipes, modifiers, or printers.
        // Exclude products where isIngredient = true (handle NULL as non-ingredient)
        return await this.productRepository
            .createQueryBuilder('p')
            .select(['p.id', 'p.name', 'p.price', 'p.category', 'p.imageUrl', 'p.isQuickSale', 'p.sku'])
            .where('p.isIngredient IS NULL OR p.isIngredient = :val', { val: false })
            .getMany();
    }

    async findOne(id: number): Promise<Product> {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: ['recipes', 'printer'],
        });
        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        const rawModifiers = await this.productRepository.query(`
            SELECT m.*
            FROM product_modifiers pm
            JOIN modifiers m ON m.id = pm.modifiersId
            WHERE pm.productsId = @0
        `, [id]);

        product.modifiers = rawModifiers.map((m: any) => ({
            id: m.id,
            name: m.name,
            groupName: m.groupName,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt
        }));
        return product;
    }

    async create(
        productData: Partial<Product> & { recipes?: Partial<Recipe>[], modifiers?: any[] },
    ): Promise<Product> {
        const { recipes, modifiers, ...data } = productData;

        let fetchedModifiers: Modifier[] = [];
        if (modifiers && modifiers.length > 0) {
            const modifierIds = modifiers.map(m => typeof m === 'object' ? m.id : m);
            fetchedModifiers = await this.modifierRepository.findByIds(modifierIds);
        }

        const newProduct = this.productRepository.create({
            ...data,
            modifiers: fetchedModifiers
        });
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
        updateData: Partial<Product> & { recipes?: Partial<Recipe>[], modifiers?: any[] },
    ): Promise<Product> {
        const product = await this.findOne(id);
        const { id: _, recipes, modifiers, ...data } = updateData as any;

        if (modifiers !== undefined) {
            let fetchedModifiers: Modifier[] = [];
            if (modifiers && modifiers.length > 0) {
                const modifierIds = modifiers.map((m: any) => typeof m === 'object' ? m.id : m);
                fetchedModifiers = await this.modifierRepository.findByIds(modifierIds);
            }
            product.modifiers = fetchedModifiers;
        }

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
