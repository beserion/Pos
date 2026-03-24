import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/product.entity';
import { ProductType } from '../product-types/product-type.entity';
import { OutputProfile } from '../output-profiles/output-profile.entity';
import { Department } from '../departments/department.entity';
import { SaleItem } from '../sales/sale-item.entity';

export interface ResolvedRoute {
  profile: OutputProfile | null;
  source: 'STOCK_CARD' | 'STOCK_GROUP' | 'PRODUCT_TYPE' | 'DEFAULT';
  productId: number;
  productName: string;
}

export interface RoutedGroup {
  profile: OutputProfile;
  items: any[];
  source: string;
}

export interface RoutingControlEntry {
  productId: number;
  productName: string;
  productTypeName: string;
  categoryName: string;
  hasCardOverride: boolean;
  hasGroupOverride: boolean;
  effectiveProfileName: string;
  effectiveSource: string;
}

@Injectable()
export class OrderRoutingService {
  private readonly logger = new Logger(OrderRoutingService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(ProductType)
    private readonly productTypeRepo: Repository<ProductType>,

    @InjectRepository(OutputProfile)
    private readonly outputProfileRepo: Repository<OutputProfile>,

    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,

    @InjectRepository(SaleItem)
    private readonly saleItemRepo: Repository<SaleItem>,
  ) {}

  /**
   * Bir ürün için etkin çıktı profilini belirler.
   * Öncelik sırası:
   * 1. Stok Kartı özel çıktı profili (product.outputProfileId)
   * 2. Stok Grubu override (department.outputProfileId — category eşleşmesi ile)
   * 3. Ürün Cinsi çıktı profili (productType.outputProfileId)
   * 4. Varsayılan / uyarı
   */
  async resolveOutputProfile(productId: number): Promise<ResolvedRoute> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['productType', 'outputProfile'],
    });

    if (!product) {
      this.logger.warn(`Product #${productId} not found`);
      return { profile: null, source: 'DEFAULT', productId, productName: 'BİLİNMEYEN' };
    }

    // 1. Stok Kartı bazında override
    if (product.outputProfileId && product.outputProfileId > 0) {
      const cardProfile = product.outputProfile ||
        await this.outputProfileRepo.findOne({
          where: { id: product.outputProfileId },
          relations: ['mainPrinter', 'infoPrinter'],
        });

      if (cardProfile) {
        this.logger.log(`Product "${product.name}" → Stok Kartı Override → Profile: "${cardProfile.name}"`);
        return { profile: cardProfile, source: 'STOCK_CARD', productId, productName: product.name };
      }
    }

    // 2. Stok Grubu (Department / Category) bazında override
    // Mevcut product.category ile department.name eşleşmesi
    if (product.category) {
      const department = await this.departmentRepo.findOne({
        where: { name: product.category },
        relations: ['outputProfile'],
      });

      if (department && department.outputProfileId && department.outputProfileId > 0) {
        const groupProfile = department.outputProfile ||
          await this.outputProfileRepo.findOne({
            where: { id: department.outputProfileId },
            relations: ['mainPrinter', 'infoPrinter'],
          });

        if (groupProfile) {
          this.logger.log(`Product "${product.name}" → Stok Grubu Override (${department.name}) → Profile: "${groupProfile.name}"`);
          return { profile: groupProfile, source: 'STOCK_GROUP', productId, productName: product.name };
        }
      }
    }

    // 3. Ürün Cinsi bazında çıktı profili
    if (product.productTypeId && product.productTypeId > 0) {
      const productType = product.productType ||
        await this.productTypeRepo.findOne({
          where: { id: product.productTypeId },
          relations: ['outputProfile'],
        });

      if (productType && productType.outputProfileId && productType.outputProfileId > 0) {
        const typeProfile = productType.outputProfile ||
          await this.outputProfileRepo.findOne({
            where: { id: productType.outputProfileId },
            relations: ['mainPrinter', 'infoPrinter'],
          });

        if (typeProfile) {
          this.logger.log(`Product "${product.name}" → Ürün Cinsi (${productType.name}) → Profile: "${typeProfile.name}"`);
          return { profile: typeProfile, source: 'PRODUCT_TYPE', productId, productName: product.name };
        }
      }
    }

    // 4. Varsayılan / uyarı
    this.logger.warn(`Product "${product.name}" → Tanımlı çıktı profili bulunamadı!`);
    return { profile: null, source: 'DEFAULT', productId, productName: product.name };
  }

  /**
   * Sipariş satırlarını hedeflerine göre gruplar.
   * Her grup: yazıcı hedefi, KDS hedefi, bilgi yazıcısı bilgisi
   */
  async routeOrderItems(items: any[]): Promise<RoutedGroup[]> {
    const groupMap = new Map<number | string, RoutedGroup>();

    for (const item of items) {
      const resolved = await this.resolveOutputProfile(item.productId);

      if (!resolved.profile) {
        // Tanımsız profil — uyarı loglandı, skip
        continue;
      }

      if (resolved.profile.noOutput) {
        // Çıktı dışı profil — hiçbir yere gönderilmez
        this.logger.log(`Product "${resolved.productName}" → noOutput, atlanıyor`);
        continue;
      }

      const key = resolved.profile.id;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          profile: resolved.profile,
          items: [],
          source: resolved.source,
        });
      }

      groupMap.get(key)!.items.push({
        ...item,
        productName: resolved.productName,
        routeSource: resolved.source,
      });
    }

    return Array.from(groupMap.values());
  }

  /**
   * Sadece yeni (henüz gönderilmemiş) satırları filtreler.
   * Döküman bölüm 12: sadece yeni eklenen satırlar gönderilmeli.
   */
  async getUnsentItems(saleId: number): Promise<SaleItem[]> {
    return this.saleItemRepo.find({
      where: {
        sale: { id: saleId },
        isSentToPrinter: false,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Gönderilen satırları işaretle
   */
  async markItemsAsSent(itemIds: number[], outputProfileId: number): Promise<void> {
    if (itemIds.length === 0) return;
    await this.saleItemRepo.update(itemIds, {
      isSentToPrinter: true,
      sentOutputProfileId: outputProfileId,
    });
  }

  /**
   * Kontrol listesi: ürün → etkin profil + kaynak bilgisi.
   * Döküman bölüm 14.5.
   */
  async getRoutingControlList(): Promise<RoutingControlEntry[]> {
    const products = await this.productRepo.find({
      relations: ['productType', 'outputProfile'],
    });

    const result: RoutingControlEntry[] = [];

    for (const product of products) {
      const resolved = await this.resolveOutputProfile(product.id);

      result.push({
        productId: product.id,
        productName: product.name,
        productTypeName: product.productType?.name || 'Tanımsız',
        categoryName: product.category || '-',
        hasCardOverride: !!(product.outputProfileId && product.outputProfileId > 0),
        hasGroupOverride: false, // Aşağıda hesaplanacak
        effectiveProfileName: resolved.profile?.name || 'TANIMSIZ',
        effectiveSource: resolved.source,
      });
    }

    // Grup override kontrolü
    const departments = await this.departmentRepo.find();
    const deptOverrides = new Set(
      departments
        .filter(d => d.outputProfileId && d.outputProfileId > 0)
        .map(d => d.name)
    );

    for (const entry of result) {
      if (deptOverrides.has(entry.categoryName)) {
        entry.hasGroupOverride = true;
      }
    }

    return result;
  }
}
