import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe } from './recipe.entity';
import { ProductsService } from '../products/products.service';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private recipeRepository: Repository<Recipe>,
    private productsService: ProductsService,
  ) { }

  async findAll(): Promise<Recipe[]> {
    return await this.recipeRepository.find({
      relations: ['product', 'ingredient'],
    });
  }

  async findByProduct(productId: number): Promise<Recipe[]> {
    return await this.recipeRepository.find({
      where: { productId },
      relations: ['product', 'ingredient'],
    });
  }

  async findOne(id: number): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOne({
      where: { id },
      relations: ['product', 'ingredient'],
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }
    return recipe;
  }

  async create(recipeData: Partial<Recipe>): Promise<Recipe> {
    const newRecipe = this.recipeRepository.create(recipeData);
    return await this.recipeRepository.save(newRecipe);
  }

  async update(id: number, updateData: Partial<Recipe>): Promise<Recipe> {
    await this.findOne(id);
    await this.recipeRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.recipeRepository.delete(id);
  }

  async calculateCost(productId: number): Promise<{
    productId: number;
    productName: string;
    totalCost: number;
    items: any[];
  }> {
    const product = await this.productsService.findOne(productId);
    const recipes = await this.findByProduct(productId);

    const items = recipes.map((recipe) => ({
      ingredientId: recipe.ingredient.id,
      ingredientName: recipe.ingredient.name,
      quantity: Number(recipe.quantity),
      unit: recipe.unit,
      unitCost: Number(recipe.ingredient.costPrice || 0),
      lineCost:
        Number(recipe.quantity) * Number(recipe.ingredient.costPrice || 0),
    }));

    const totalCost = items.reduce((sum, item) => sum + item.lineCost, 0);

    return {
      productId: product.id,
      productName: product.name,
      totalCost,
      items,
    };
  }

  async getRecipeSummary(productId: number): Promise<{
    productName: string;
    salePrice: number;
    foodCost: number;
    profitMargin: number;
    profitMarginPercent: number;
  }> {
    const product = await this.productsService.findOne(productId);
    const costData = await this.calculateCost(productId);

    const salePrice = Number(product.price);
    const foodCost = costData.totalCost;
    const profitMargin = salePrice - foodCost;
    const profitMarginPercent =
      salePrice > 0 ? (profitMargin / salePrice) * 100 : 0;

    return {
      productName: product.name,
      salePrice,
      foodCost,
      profitMargin,
      profitMarginPercent: Math.round(profitMarginPercent * 100) / 100,
    };
  }
}
