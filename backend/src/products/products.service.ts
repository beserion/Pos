import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { Recipe } from '../recipes/recipe.entity';
import { RecipeHeader } from '../recipes/recipe-header.entity';
import { RecipeLine } from '../recipes/recipe-line.entity';
import { Modifier } from '../modifiers/modifier.entity';

import { ProductTransaction } from './product-transaction.entity';
import { ProductType } from '../product-types/product-type.entity';
import { Department } from '../departments/department.entity';
import { SaleItem } from '../sales/sale-item.entity';
import { SetGroupItem } from './set-group-item.entity';
import * as xlsx from 'xlsx';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private productRepository: Repository<Product>,
        @InjectRepository(Recipe)
        private recipeRepository: Repository<Recipe>,
        @InjectRepository(Modifier)
        private modifierRepository: Repository<Modifier>,
        @InjectRepository(RecipeHeader)
        private headerRepository: Repository<RecipeHeader>,
        @InjectRepository(RecipeLine)
        private lineRepository: Repository<RecipeLine>,
        @InjectRepository(ProductTransaction)
        private transactionRepository: Repository<ProductTransaction>,
        @InjectRepository(ProductType)
        private productTypeRepository: Repository<ProductType>,
        @InjectRepository(Department)
        private departmentRepository: Repository<Department>,
    ) { }

    private productsCache: Product[] | null = null;
    private quickSaleCache: Product[] | null = null;
    
    clearCache() {
        this.productsCache = null;
        this.quickSaleCache = null;
    }

    async countProducts(): Promise<number> {
        return await this.productRepository.count();
    }

    async findAll(): Promise<Product[]> {
        if (this.productsCache) {
            return this.productsCache;
        }

        const products = await this.productRepository.find({
            relations: ['recipes', 'variations', 'printer', 'productType', 'outputProfile', 'setMenu', 'setMenu.groups', 'setMenu.groups.items', 'linkedStockCard', 'linkedStockCard.stockGroupRelation', 'visibleZones'],
            order: { orderIndex: 'ASC', id: 'ASC' }
        });

        if (products.length > 0) {
            // Load all modifiers
            const allModifiers = await this.modifierRepository.find({ relations: ['group'] });

            // Load direct product-modifier links
            const rawLinks = await this.productRepository.query(`
                SELECT productsId as productId, modifiersId as modifierId
                FROM product_modifiers
            `);

            products.forEach(p => {
                const directIds = rawLinks.filter((l: any) => l.productId === p.id).map((l: any) => l.modifierId);
                
                const mods = allModifiers.filter((m: any) => 
                    directIds.includes(m.id) ||
                    m.isGeneral === true ||
                    (m.productTypeId !== null && m.productTypeId !== undefined && p.productTypeId === m.productTypeId) ||
                    (m.productCategory && p.category && p.category.toLowerCase().trim() === m.productCategory.toLowerCase().trim())
                );

                p.modifiers = mods.map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    groupName: m.group?.name || m.groupName,
                    isGeneral: m.isGeneral,
                    productTypeId: m.productTypeId,
                    productCategory: m.productCategory,
                    createdAt: m.createdAt,
                    updatedAt: m.updatedAt
                })) as any;
            });
        }
        this.productsCache = products;
        return products;
    }

    async findAllQuickSale(): Promise<Product[]> {
        if (this.quickSaleCache) {
            return this.quickSaleCache;
        }

        // Fast, lightweight fetch without joining recipes, modifiers, or printers.
        // Exclude products where isIngredient = true (handle NULL as non-ingredient)
        const data = await this.productRepository
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.variations', 'v')
            .leftJoinAndSelect('p.linkedStockCard', 'sc')
            .select(['p.id', 'p.name', 'p.price', 'p.category', 'p.imageUrl', 'p.isQuickSale', 'p.sku', 'p.productTypeId', 'p.printerId', 'p.orderIndex', 'p.stockGroup', 'p.stockGroupId', 'v.id', 'v.variationName', 'v.fixedPrice', 'v.priceFactor', 'v.inventoryLinkType', 'v.isActive', 'sc.id', 'sc.stockGroup', 'sc.category'])
            .where('p.isIngredient IS NULL OR p.isIngredient = :val', { val: false })
            .orderBy('p.orderIndex', 'ASC')
            .addOrderBy('p.id', 'ASC')
            .getMany();

        this.quickSaleCache = data;
        return data;
    }

    async findOne(id: number, manager?: any): Promise<Product> {
        const repo = manager ? manager.getRepository(Product) : this.productRepository;
        const product = await repo.findOne({
            where: { id },
            relations: ['recipes', 'printer', 'productType', 'outputProfile', 'setMenu', 'setMenu.groups', 'setMenu.groups.items'],
        });
        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        const modRepo = manager ? manager.getRepository(Modifier) : this.modifierRepository;
        const allModifiers = await modRepo.find({ relations: ['group'] });
        const rawLinks = await repo.query(`
            SELECT modifiersId as modifierId
            FROM product_modifiers
            WHERE productsId = @0
        `, [id]);
        const directIds = rawLinks.map((l: any) => l.modifierId);

        const mods = allModifiers.filter((m: any) => 
            directIds.includes(m.id) ||
            m.isGeneral === true ||
            (m.productTypeId !== null && m.productTypeId !== undefined && product.productTypeId === m.productTypeId) ||
            (m.productCategory && product.category && product.category.toLowerCase().trim() === m.productCategory.toLowerCase().trim())
        );

        product.modifiers = mods.map((m: any) => ({
            id: m.id,
            name: m.name,
            groupName: m.group?.name || m.groupName,
            isGeneral: m.isGeneral,
            productTypeId: m.productTypeId,
            productCategory: m.productCategory,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt
        })) as any;
        return product;
    }

    async create(
        productData: any,
    ): Promise<Product> {
        const { recipes, recipeHeader, modifiers, visibleZoneIds, ...data } = productData;

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

        if (data.sku) {
            const existingSku = await this.productRepository.findOne({ where: { sku: data.sku } });
            if (existingSku) throw new BadRequestException(`"${data.sku}" kodlu ürün zaten mevcut.`);
        }
        if (data.name) {
            const existingName = await this.productRepository.findOne({ where: { name: data.name } });
            if (existingName) throw new BadRequestException(`"${data.name}" isimli ürün zaten mevcut.`);
        }
        if (data.barcode) {
            const existingBarcode = await this.productRepository.findOne({ where: { barcode: data.barcode } });
            if (existingBarcode) throw new BadRequestException(`"${data.barcode}" barkodlu ürün zaten mevcut.`);
        }

        let fetchedModifiers: Modifier[] = [];
        if (modifiers && modifiers.length > 0) {
            const modifierIds = modifiers.map((m: any) => typeof m === 'object' ? m.id : m);
            fetchedModifiers = await this.modifierRepository.findByIds(modifierIds);
        }

        const newProduct = this.productRepository.create({
            ...data,
            modifiers: fetchedModifiers,
            visibleZones: visibleZoneIds ? visibleZoneIds.map((id: number) => ({ id })) : undefined,
            isActive: data.isActive !== undefined ? data.isActive : true // Varsayılan aktif
        }) as any;
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

        if (recipeHeader) {
            const header = this.headerRepository.create({
                productId: savedProduct.id,
                name: recipeHeader.name || `${savedProduct.name} Reçetesi`,
                isActive: recipeHeader.isActive !== false,
                note: recipeHeader.note || '',
                lines: (recipeHeader.lines || []).map((line: any) =>
                    this.lineRepository.create({
                        stockCardId: line.stockCardId,
                        quantity: line.quantity,
                        unit: line.unit || 'adet',
                        isRequired: line.isRequired !== false,
                        description: line.description,
                    }),
                ),
            });
            await this.headerRepository.save(header);
        }

        this.clearCache();
        return savedProduct;
    }

    async update(
        id: number,
        updateData: any,
    ): Promise<Product> {
        const product = await this.productRepository.findOne({ where: { id }, relations: ['recipes', 'printer', 'productType', 'outputProfile', 'setMenu', 'setMenu.groups', 'setMenu.groups.items', 'modifiers', 'visibleZones'] });
        if (!product) throw new NotFoundException(`Product with ID ${id} not found`);

        const { id: _, recipes, recipeHeader, modifiers, visibleZoneIds, ...data } = updateData as any;

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

        if (data.sku && data.sku !== product.sku) {
            const dup = await this.productRepository.findOne({ where: { sku: data.sku } });
            if (dup) throw new BadRequestException(`"${data.sku}" kodlu ürün zaten mevcut.`);
        }
        if (data.name && data.name !== product.name) {
            const dup = await this.productRepository.findOne({ where: { name: data.name } });
            if (dup) throw new BadRequestException(`"${data.name}" isimli ürün zaten mevcut.`);
        }
        if (data.barcode && data.barcode !== product.barcode && data.barcode !== '') {
            const dup = await this.productRepository.findOne({ where: { barcode: data.barcode } });
            if (dup) throw new BadRequestException(`"${data.barcode}" barkodlu ürün zaten mevcut.`);
        }

        if (modifiers !== undefined) {
            let fetchedModifiers: Modifier[] = [];
            if (modifiers && modifiers.length > 0) {
                const modifierIds = modifiers.map((m: any) => typeof m === 'object' ? m.id : m);
                fetchedModifiers = await this.modifierRepository.findByIds(modifierIds);
            }
            product.modifiers = fetchedModifiers;
        }

        if (visibleZoneIds !== undefined) {
            product.visibleZones = visibleZoneIds.map((zid: number) => ({ id: zid })) as any[];
        }

        const oldPrice = parseFloat(String(product.price || 0));
        const newPrice = data.price !== undefined ? parseFloat(String(data.price)) : oldPrice;

        this.productRepository.merge(product, data);
        const savedProduct = await this.productRepository.save(product);

        if (newPrice !== oldPrice) {
            try {
                await this.productRepository.query(`
                    INSERT INTO audit_logs (timestamp, actionType, productName, oldValue, newValue, description, companyId, businessDate)
                    VALUES (GETDATE(), 'PRICE_CHANGE', @0, @1, @2, @3, 1, COALESCE((SELECT NULLIF(value, '') FROM system_parameters WHERE module = 'pos' AND [key] = 'active_business_date'), CONVERT(VARCHAR(10), GETDATE(), 23)))
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

        if (recipeHeader !== undefined) {
            // Delete old recipe headers and lines for this product if needed, 
            // or just update if ID matches. For simplicity and consistency with existing logic:
            await this.headerRepository.delete({ productId: id });
            if (recipeHeader) {
                const header = this.headerRepository.create({
                    productId: id,
                    name: recipeHeader.name || `${product.name} Reçetesi`,
                    isActive: recipeHeader.isActive !== false,
                    note: recipeHeader.note || '',
                    lines: (recipeHeader.lines || []).map((line: any) =>
                        this.lineRepository.create({
                            stockCardId: line.stockCardId,
                            quantity: line.quantity,
                            unit: line.unit || 'adet',
                            isRequired: line.isRequired !== false,
                            description: line.description,
                        }),
                    ),
                });
                await this.headerRepository.save(header);
            }
        }

        this.clearCache();
        return savedProduct;
    }

    async remove(id: number): Promise<void> {
        const product = await this.findOne(id);

        // 1. Check product transactions
        const transactionCount = await this.transactionRepository.count({
            where: { productId: id }
        });
        if (transactionCount > 0) {
            throw new BadRequestException('Bu ürüne ait satış veya işlem hareketleri bulunmaktadır. Hareketi olan ürünler silinemez, ancak pasif duruma getirilebilir.');
        }

        // 2. Check sale items (completed tickets/checks)
        const saleItemCount = await this.productRepository.manager.count(SaleItem, {
            where: { productId: id }
        });
        if (saleItemCount > 0) {
            throw new BadRequestException('Bu ürün geçmiş veya mevcut adisyonlarda yer almaktadır. Adisyonda kullanılan ürünler silinemez, ancak pasif duruma getirilebilir.');
        }

        // 3. Check if used as hammadde (ingredient) in other recipes
        const ingredientCount = await this.recipeRepository.count({
            where: { ingredientId: id }
        });
        if (ingredientCount > 0) {
            throw new BadRequestException('Bu ürün başka bir ürünün reçetesinde malzeme (hammadde) olarak kullanılmaktadır. Lütfen önce ilgili reçetelerden kaldırın.');
        }

        // 4. Check if used in set menu groups
        const setGroupItemCount = await this.productRepository.manager.count(SetGroupItem, {
            where: { productId: id }
        });
        if (setGroupItemCount > 0) {
            throw new BadRequestException('Bu ürün bir set menü (seçmeli menü) içerisinde grup elemanı olarak tanımlanmıştır. Lütfen önce set menü tanımından kaldırın.');
        }

        // Safe delete sequence:
        // A. Break variation to recipe header references
        await this.productRepository.manager.update('ProductVariation', { productId: id }, { recipeHeaderId: null });

        // B. Delete recipe lines for product's recipe headers
        const recipeHeaders = await this.headerRepository.find({ where: { productId: id } });
        for (const header of recipeHeaders) {
            await this.lineRepository.delete({ recipeHeaderId: header.id });
        }

        // C. Delete recipe headers
        await this.headerRepository.delete({ productId: id });

        // D. Delete product recipes
        await this.recipeRepository.delete({ productId: id });

        // E. Finally, delete the product (cascades variations, set menu, modifiers, visible zones)
        await this.productRepository.remove(product);
        this.clearCache();
    }

    async reorderProducts(items: { id: number, orderIndex: number }[]): Promise<void> {
        if (!items || items.length === 0) return;
        for (const item of items) {
             await this.productRepository.update(item.id, { orderIndex: item.orderIndex });
        }
        this.clearCache();
    }

    async findAllTransactions(): Promise<ProductTransaction[]> {
        return await this.transactionRepository.find({
            order: { businessDate: 'DESC', id: 'DESC' },
            take: 5000 // Limit for performance
        });
    }

    async recordTransaction(data: Partial<ProductTransaction>, manager?: any): Promise<ProductTransaction> {
        const repo = manager ? manager.getRepository(ProductTransaction) : this.transactionRepository;
        const transaction = repo.create({
            ...data,
            businessDate: data.businessDate || new Date(),
        });
        return await repo.save(transaction);
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

    async importProducts(buffer: Buffer) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        const productTypeMap = new Map<string, number>();
        const uniqueTypes = [...new Set(data.map((row: any) => row['ürüncins_adi']).filter(Boolean))] as string[];

        for (const typeName of uniqueTypes) {
            let type = await this.productTypeRepository.findOne({ where: { name: typeName } });
            if (!type) {
                type = this.productTypeRepository.create({ name: typeName, isActive: true });
                type = await this.productTypeRepository.save(type);
            }
            productTypeMap.set(typeName, type.id);
        }

        const uniqueCategories = [...new Set(data.map((row: any) => row['ürün grup']).filter(Boolean))] as string[];
        for (const catName of uniqueCategories) {
            let dept = await this.departmentRepository.findOne({ where: { name: catName } });
            if (!dept) {
                dept = this.departmentRepository.create({ name: catName, isActive: true });
                await this.departmentRepository.save(dept);
            }
        }

        let addedCount = 0;
        let updatedCount = 0;

        for (const row of data as any[]) {
            const sku = String(row['ürün kodu'] || '').trim();
            const name = String(row['ürün adi'] || '').trim();
            if (!sku || !name) continue;

            const category = String(row['ürün grup'] || '').trim();
            const barcode = row['barkod'] ? String(row['barkod']).trim() : null;
            const unit = String(row['birim'] || 'ADET').trim();
            const price = parseFloat(row['fiyat1']) || 0;
            const vatRate = parseFloat(row['kdvsatis']) || 0;
            const typeName = row['ürüncins_adi'];
            const productTypeId = typeName ? productTypeMap.get(typeName) : null;

            const existingProduct = await this.productRepository.findOne({ where: { sku } });

            if (existingProduct) {
                await this.productRepository.update(existingProduct.id, {
                    name,
                    posName: name,
                    kitchenName: name,
                    barcode: barcode || undefined,
                    price,
                    vatRate,
                    category,
                    unit,
                    productTypeId: productTypeId || undefined,
                    isActive: true,
                    posVisible: true,
                    isQuickSale: true, // Mevcut ürünleri de hızlı satışa aç
                    updatedAt: new Date()
                } as any);
                updatedCount++;
            } else {
                const newProduct = this.productRepository.create({
                    name,
                    sku,
                    posName: name,
                    kitchenName: name,
                    barcode: barcode || undefined,
                    price,
                    vatRate,
                    category,
                    isActive: true,
                    posVisible: true,
                    takeawayVisible: true,
                    deliveryVisible: true,
                    qrVisible: true,
                    kioskVisible: true,
                    unit,
                    productTypeId: productTypeId || undefined,
                    orderIndex: 0,
                    openPriceEnabled: false,
                    discountAllowed: true,
                    compAllowed: true,
                    isQuickSale: true, // Yeni ürünleri hızlı satışa aç
                    isIngredient: false,
                    isSet: false
                } as any);
                await this.productRepository.save(newProduct);
                addedCount++;
            }
        }

        this.clearCache();
        return { addedCount, updatedCount, totalCount: data.length };
    }
}
