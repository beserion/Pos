<<<<<<< HEAD
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
=======
import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
>>>>>>> upstream/server
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { Recipe } from '../recipes/recipe.entity';
import { Modifier } from '../modifiers/modifier.entity';
import { RecipeHeader } from '../recipes/recipe-header.entity';
import { ParametersService } from '../parameters/parameters.service';

import { ProductTransaction } from './product-transaction.entity';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private productRepository: Repository<Product>,
        @InjectRepository(Recipe)
        private recipeRepository: Repository<Recipe>,
        @InjectRepository(Modifier)
        private modifierRepository: Repository<Modifier>,
<<<<<<< HEAD
        @InjectRepository(RecipeHeader)
        private recipeHeaderRepository: Repository<RecipeHeader>,
        private parametersService: ParametersService,
=======
        @InjectRepository(ProductTransaction)
        private transactionRepository: Repository<ProductTransaction>,
>>>>>>> upstream/server
    ) { }

    async countProducts(): Promise<number> {
        return await this.productRepository.count();
    }

    async findAll(): Promise<Product[]> {
        const products = await this.productRepository.find({
<<<<<<< HEAD
            relations: [
                'recipes', 'printer', 'productType', 'outputProfile',
                'setMenu', 'setMenu.groups', 'setMenu.groups.items',
                'linkedStockCard',
            ],
=======
            relations: ['recipes', 'variations', 'printer', 'productType', 'outputProfile', 'setMenu', 'setMenu.groups', 'setMenu.groups.items', 'linkedStockCard', 'linkedStockCard.stockGroupRelation'],
            order: { orderIndex: 'ASC', id: 'ASC' }
>>>>>>> upstream/server
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
        // Fast, lightweight fetch for POS screen
        // Exclude products where isIngredient = true (handle NULL as non-ingredient)
        return await this.productRepository
            .createQueryBuilder('p')
<<<<<<< HEAD
            .select([
                'p.id', 'p.name', 'p.price', 'p.productGroup', 'p.imageUrl',
                'p.isQuickSale', 'p.sku', 'p.productTypeId', 'p.printerId',
                'p.inventoryLinkType', 'p.posVisible', 'p.posName',
                'p.buttonOrder', 'p.buttonColor', 'p.vatRate',
                'p.openPriceEnabled', 'p.discountAllowed', 'p.compAllowed',
            ])
            .where('(p.isIngredient IS NULL OR p.isIngredient = :val)', { val: false })
            .andWhere('p.isActive = :active', { active: true })
            .orderBy('p.buttonOrder', 'ASC')
            .addOrderBy('p.name', 'ASC')
=======
            .leftJoinAndSelect('p.variations', 'v')
            .leftJoinAndSelect('p.linkedStockCard', 'sc')
            .select(['p.id', 'p.name', 'p.price', 'p.category', 'p.imageUrl', 'p.isQuickSale', 'p.sku', 'p.productTypeId', 'p.printerId', 'p.orderIndex', 'p.stockGroup', 'p.stockGroupId', 'v.id', 'v.variationName', 'v.fixedPrice', 'v.priceFactor', 'v.inventoryLinkType', 'v.isActive', 'sc.id', 'sc.stockGroup', 'sc.category'])
            .where('p.isIngredient IS NULL OR p.isIngredient = :val', { val: false })
            .orderBy('p.orderIndex', 'ASC')
            .addOrderBy('p.id', 'ASC')
>>>>>>> upstream/server
            .getMany();
    }

    async findOne(id: number): Promise<Product> {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: [
                'recipes', 'printer', 'productType', 'outputProfile',
                'setMenu', 'setMenu.groups', 'setMenu.groups.items',
                'linkedStockCard',
            ],
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

    // ─── Ürün Aktif Etme Validasyonu (§10) ──────────────
    async validateForActivation(product: Product): Promise<string[]> {
        const errors: string[] = [];

        // §4: Cins ZORUNLU
        if (!product.productTypeId) {
            errors.push('Ürün cinsi (sales_cins) seçilmeden ürün aktif olamaz');
        }

        // §17: Stok takibi parametresi kontrolü
        const stockTrackingEnabled = await this.parametersService.getValue('inventory', 'stock_tracking_enabled');

        if (!product.inventoryLinkType || product.inventoryLinkType === 'none') {
            if (stockTrackingEnabled === 'true') {
                errors.push('Stok takibi açıkken inventory_link_type "none" olamaz');
            }
            // none tipinde stok bağlantısı aranmaz
        } else if (product.inventoryLinkType === 'direct_stock') {
            // §10 B) direct_stock validasyonları
            if (!product.linkedStockCardId) {
                errors.push('Bağlı stok kartı (linked_stock_item) seçilmeli');
            }
            if (!product.directStockQty || Number(product.directStockQty) <= 0) {
                errors.push('Düşüm miktarı (direct_stock_qty) belirtilmeli');
            }
            if (!product.directStockUnit) {
                errors.push('Düşüm birimi (direct_stock_unit) belirtilmeli');
            }
        } else if (product.inventoryLinkType === 'recipe') {
            // §10 C) recipe validasyonları
            const recipe = await this.recipeHeaderRepository.findOne({
                where: { productId: product.id, isActive: true },
                relations: ['lines'],
            });
            if (!recipe || !recipe.lines || recipe.lines.length === 0) {
                errors.push('En az 1 aktif reçete satırı olmalı');
            }
        }

        return errors;
    }

    async create(
        productData: Partial<Product> & { recipes?: Partial<Recipe>[], modifiers?: any[] },
    ): Promise<Product> {
        const { recipes, modifiers, ...data } = productData;

        // 12.md Validasyonları: Ürün Cinsi Zorunluluğu
        if (!data.productTypeId) {
            throw new Error('Ürün Cinsi (sales_cins) seçilmesi zorunludur.');
        }

        // 12.md Validasyonları: Stok Bağı Kontrolü
        if (data.inventoryLinkType === 'direct_stock') {
            if (!data.linkedStockItemId || !data.directStockQty) {
                throw new Error('Direkt stok bağı için stok kartı ve miktar bilgisi zorunludur.');
            }
        }

        let fetchedModifiers: Modifier[] = [];
        if (modifiers && modifiers.length > 0) {
            const modifierIds = modifiers.map(m => typeof m === 'object' ? m.id : m);
            fetchedModifiers = await this.modifierRepository.findByIds(modifierIds);
        }

        // inventoryLinkType default
        if (!data.inventoryLinkType) {
            data.inventoryLinkType = 'none';
        }

        const newProduct = this.productRepository.create({
            ...data,
            modifiers: fetchedModifiers,
            isActive: data.isActive !== undefined ? data.isActive : true // Varsayılan aktif
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

        // 12.md Validasyonları: Ürün Cinsi Zorunluluğu
        if (data.productTypeId !== undefined && !data.productTypeId) {
            throw new Error('Ürün Cinsi (sales_cins) seçilmesi zorunludur.');
        }

        // 12.md Validasyonları: Stok Bağı Kontrolü
        const finalLinkType = data.inventoryLinkType || product.inventoryLinkType;
        if (finalLinkType === 'direct_stock') {
            const finalStockId = data.linkedStockItemId || product.linkedStockItemId;
            const finalQty = data.directStockQty !== undefined ? data.directStockQty : product.directStockQty;
            if (!finalStockId || !finalQty) {
                throw new Error('Direkt stok bağı için stok kartı ve miktar bilgisi zorunludur.');
            }
        }

        if (modifiers !== undefined) {
            let fetchedModifiers: Modifier[] = [];
            if (modifiers && modifiers.length > 0) {
                const modifierIds = modifiers.map((m: any) => typeof m === 'object' ? m.id : m);
                fetchedModifiers = await this.modifierRepository.findByIds(modifierIds);
            }
            product.modifiers = fetchedModifiers;
        }

        const oldPrice = parseFloat(String(product.price || 0));
        const newPrice = data.price !== undefined ? parseFloat(String(data.price)) : oldPrice;

        this.productRepository.merge(product, data);

        // §10: Aktif etme validasyonu
        if (data.isActive === true || (product.isActive && data.isActive === undefined)) {
            const errors = await this.validateForActivation(product);
            if (errors.length > 0 && data.isActive === true) {
                throw new BadRequestException({
                    message: 'Ürün aktif edilemez',
                    errors,
                });
            }
        }

        const savedProduct = await this.productRepository.save(product);

        if (newPrice !== oldPrice) {
            try {
                await this.productRepository.query(`
                    INSERT INTO audit_logs (timestamp, actionType, productName, oldValue, newValue, description, companyId)
                    VALUES (GETDATE(), 'PRICE_CHANGE', @0, @1, @2, @3, 1)
                `, [product.name, String(oldPrice), String(newPrice), 'Ürün taban fiyatı güncellendi']);
            } catch { /* sessiz geç */ }
        }

        if (recipes !== undefined) {
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
        throw new BadRequestException('Güvenlik kuralı gereği ürünler kalıcı olarak silinemez. Lütfen silmek yerine ürünü pasife almayı (Gizle) deneyin.');
    }

    async reorderProducts(items: { id: number, orderIndex: number }[]): Promise<void> {
        if (!items || items.length === 0) return;
        for (const item of items) {
             await this.productRepository.update(item.id, { orderIndex: item.orderIndex });
        }
    }

    async findAllTransactions(): Promise<ProductTransaction[]> {
        return await this.transactionRepository.find({
            order: { businessDate: 'DESC', id: 'DESC' },
            take: 5000 // Limit for performance
        });
    }

    async recordTransaction(data: Partial<ProductTransaction>): Promise<ProductTransaction> {
        const transaction = this.transactionRepository.create({
            ...data,
            businessDate: data.businessDate || new Date(),
        });
        return await this.transactionRepository.save(transaction);
    }

    async onModuleInit() {
        await this.migrateInventoryLinks();
    }

    async migrateInventoryLinks() {
        try {
            await this.productRepository.query(`
                UPDATE products 
                SET inventoryLinkType = 'recipe' 
                WHERE (inventoryLinkType = 'none' OR inventoryLinkType IS NULL)
                  AND id IN (SELECT productId FROM recipes)
            `);
            console.log('Inventory link migration completed.');
        } catch (e) {
            console.error('Inventory link migration failed', e);
        }
    }

    // ─── Validasyon raporu: Eksik bağı olan ürünler (§10, §19) ─
    async getActivationReview(): Promise<{ productId: number; productName: string; errors: string[] }[]> {
        const products = await this.productRepository.find({
            where: { isActive: true },
        });

        const results: { productId: number; productName: string; errors: string[] }[] = [];

        for (const product of products) {
            const errors = await this.validateForActivation(product);
            if (errors.length > 0) {
                results.push({
                    productId: product.id,
                    productName: product.name,
                    errors,
                });
            }
        }

        return results;
    }
}
