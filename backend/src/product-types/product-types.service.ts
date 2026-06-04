import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductType } from './product-type.entity';
import { Product } from '../products/product.entity';

@Injectable()
export class ProductTypesService {
  constructor(
    @InjectRepository(ProductType)
    private readonly repo: Repository<ProductType>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findAll(): Promise<ProductType[]> {
    return this.repo.find({
      relations: ['outputProfile'],
    });
  }

  async findOne(id: number): Promise<ProductType> {
    const type = await this.repo.findOne({
      where: { id },
      relations: ['outputProfile'],
    });
    if (!type) {
      throw new NotFoundException(`ProductType #${id} not found`);
    }
    return type;
  }

  async create(data: Partial<ProductType>): Promise<ProductType> {
    if (data.id) delete data.id;
    if (data.outputProfileId === 0) {
      data.outputProfileId = null as any;
    }
    if (data.name) {
      const existing = await this.repo.findOne({ where: { name: data.name } });
      if (existing) throw new BadRequestException(`"${data.name}" isimli ürün cinsi zaten mevcut.`);
    }
    const type = this.repo.create(data);
    return this.repo.save(type);
  }

  async update(id: number, data: Partial<ProductType>): Promise<ProductType> {
    if (data.id) delete data.id;
    if (data.outputProfileId === 0) {
      data.outputProfileId = null as any;
    }
    const type = await this.findOne(id);
    if (data.name && data.name !== type.name) {
      const dup = await this.repo.findOne({ where: { name: data.name } });
      if (dup) throw new BadRequestException(`"${data.name}" isimli ürün cinsi zaten mevcut.`);
    }
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const type = await this.findOne(id);
    
    const productInType = await this.productRepository.findOne({
      where: { productTypeId: id }
    });
    if (productInType) {
      throw new BadRequestException(
        `"${type.name}" ürün cinsi kullanımda (bu cinse bağlı ürünler var) olduğu için silinemez. Önce ürünleri güncelleyin veya silin.`
      );
    }

    await this.repo.remove(type);
  }
}
