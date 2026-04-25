import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe } from './recipe.entity';
import { RecipeHeader } from './recipe-header.entity';
import { RecipeLine } from './recipe-line.entity';
import { ProductsService } from '../products/products.service';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private recipeRepository: Repository<Recipe>,
    @InjectRepository(RecipeHeader)
    private headerRepository: Repository<RecipeHeader>,
    @InjectRepository(RecipeLine)
    private lineRepository: Repository<RecipeLine>,
    private productsService: ProductsService,
  ) {}

  // ─── Legacy flat recipe methods (backward compat) ────

  async findAllLegacy(): Promise<Recipe[]> {
    return this.recipeRepository.find({
      relations: ['product', 'ingredient'],
    });
  }

  async findByProductLegacy(productId: number): Promise<Recipe[]> {
    return this.recipeRepository.find({
      where: { productId },
      relations: ['product', 'ingredient'],
    });
  }

  // ─── New Header + Lines methods ──────────────────────

  async findAll(): Promise<RecipeHeader[]> {
    return this.headerRepository.find({
      relations: ['product', 'lines', 'lines.stockCard'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProduct(productId: number): Promise<RecipeHeader[]> {
    return this.headerRepository.find({
      where: { productId },
      relations: ['product', 'lines', 'lines.stockCard'],
    });
  }

  /**
   * Find the active recipe for a product. Returns null if none.
   */
  async findActiveByProduct(productId: number): Promise<RecipeHeader | null> {
    return this.headerRepository.findOne({
      where: { productId, isActive: true },
      relations: ['product', 'lines', 'lines.stockCard'],
    });
  }

  async findOne(id: number): Promise<RecipeHeader> {
    const header = await this.headerRepository.findOne({
      where: { id },
      relations: ['product', 'lines', 'lines.stockCard'],
    });
    if (!header) {
      throw new NotFoundException(`RecipeHeader with ID ${id} not found`);
    }
    return header;
  }

  async create(data: {
    productId: number;
    name?: string;
    isActive?: boolean;
    note?: string;
    lines: {
      stockCardId: number;
      quantity: number;
      unit?: string;
      isRequired?: boolean;
      description?: string;
    }[];
  }): Promise<RecipeHeader> {
    // If new recipe is active, deactivate other recipes for this product
    if (data.isActive !== false) {
      await this.headerRepository.update(
        { productId: data.productId },
        { isActive: false },
      );
    }

    const header = this.headerRepository.create({
      productId: data.productId,
      name: data.name,
      isActive: data.isActive !== false,
      note: data.note,
    });

    const saved = await this.headerRepository.save(header);

    if (data.lines && data.lines.length > 0) {
      const newLines = data.lines.map((line) =>
        this.lineRepository.create({
          recipeHeaderId: saved.id,
          stockCardId: line.stockCardId,
          quantity: line.quantity,
          unit: line.unit || 'adet',
          isRequired: line.isRequired !== false,
          description: line.description,
        }),
      );
      await this.lineRepository.save(newLines);
    }

    return this.findOne(saved.id);
  }

  async update(
    id: number,
    data: {
      name?: string;
      isActive?: boolean;
      note?: string;
      lines?: {
        id?: number;
        stockCardId: number;
        quantity: number;
        unit?: string;
        isRequired?: boolean;
        description?: string;
      }[];
    },
  ): Promise<RecipeHeader> {
    const header = await this.findOne(id);

    // If making active, deactivate others
    if (data.isActive === true && !header.isActive) {
      await this.headerRepository.update(
        { productId: header.productId },
        { isActive: false },
      );
    }

    // Update header fields
    if (data.name !== undefined) header.name = data.name;
    if (data.isActive !== undefined) header.isActive = data.isActive;
    if (data.note !== undefined) header.note = data.note;
    
    // Clear relations before header save to prevent cascade issues
    const { lines: _oldLines, product: _prod, ...headerOnly } = header;
    await this.headerRepository.save(headerOnly);

    // Replace lines if provided
    if (data.lines) {
      // Delete existing lines
      await this.lineRepository.delete({ recipeHeaderId: id });

      // Create new lines
      const newLines = data.lines.map((line) =>
        this.lineRepository.create({
          recipeHeaderId: id,
          stockCardId: line.stockCardId,
          quantity: line.quantity,
          unit: line.unit || 'adet',
          isRequired: line.isRequired !== false,
          description: line.description,
        }),
      );
      await this.lineRepository.save(newLines);
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.headerRepository.delete(id);
  }

  // ─── Cost Calculation ────────────────────────────────

  async calculateCost(productId: number): Promise<{
    productId: number;
    productName: string;
    recipeName: string;
    totalCost: number;
    items: {
      stockCardId: number;
      stockCardName: string;
      quantity: number;
      unit: string;
      unitCost: number;
      lineCost: number;
      isRequired: boolean;
    }[];
  }> {
    const product = await this.productsService.findOne(productId);
    const recipe = await this.findActiveByProduct(productId);

    if (!recipe) {
      return {
        productId: product.id,
        productName: product.name,
        recipeName: '',
        totalCost: 0,
        items: [],
      };
    }

    const items = recipe.lines.map((line) => ({
      stockCardId: line.stockCard.id,
      stockCardName: line.stockCard.name,
      quantity: Number(line.quantity),
      unit: line.unit,
      unitCost: Number(line.stockCard.costPerBaseUnit || 0),
      lineCost: Number(line.quantity) * Number(line.stockCard.costPerBaseUnit || 0),
      isRequired: line.isRequired,
    }));

    const totalCost = items.reduce((sum, item) => sum + item.lineCost, 0);

    return {
      productId: product.id,
      productName: product.name,
      recipeName: recipe.name || '',
      totalCost,
      items,
    };
  }

  async getRecipeSummary(productId: number): Promise<{
    productName: string;
    recipeName: string;
    salePrice: number;
    foodCost: number;
    profit: number;
    costRatio: number;
  }> {
    const product = await this.productsService.findOne(productId);
    const costData = await this.calculateCost(productId);

    const salePrice = Number(product.price);
    const vatRate = Number(product.vatRate || 0);
    const netSalePrice = salePrice / (1 + (vatRate / 100));
    const foodCost = costData.totalCost;
    const profit = netSalePrice - foodCost;
    const costRatio = netSalePrice > 0 ? (foodCost / netSalePrice) * 100 : 0;

    return {
      productName: product.name,
      recipeName: costData.recipeName,
      salePrice,
      foodCost,
      profit,
      costRatio: Math.round(costRatio * 100) / 100,
    };
  }
}
