import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/product.entity';
import { ProductType } from '../product-types/product-type.entity';
import { OutputProfile } from '../output-profiles/output-profile.entity';
import { Department } from '../departments/department.entity';
import { SaleItem } from '../sales/sale-item.entity';
import { StockCard } from '../stock-cards/stock-card.entity';

export interface ResolvedRoute {
  profile: OutputProfile | null;
  source: 'PRODUCT_CARD' | 'PRODUCT_GROUP' | 'PRODUCT_TYPE' | 'STOCK_CARD' | 'STOCK_GROUP' | 'DEFAULT' | 'NO_OUTPUT';
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
  inventoryLinkType: string;
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

    @InjectRepository(StockCard)
    private readonly stockCardRepo: Repository<StockCard>,
  ) {}

  /**
   * §6 – Yazıcı Yönlendirme Öncelik Sırası (7 seviye)
   *
   * 1. Ürün kartına özel yazıcı / profil (product.outputProfileId)
   * 2. Ürün grubuna özel yazıcı (department.outputProfileId - category/productGroup eşleşmesi)
   * 3. Ürün cinsine özel yazıcı (productType.outputProfileId)
   * 4. direct_stock ürünlerde bağlı stok kartına özel yazıcı (stockCard.outputProfileId)
   * 5. Bağlı stok grubuna özel yazıcı (stockCard.stockGroup → department eşleşmesi)
   * 6. Hiçbir tanım yoksa varsayılan yazıcı
   * 7. "Yazıcı gönderme" kuralı (productType.skipPrinterOutput || profile.noOutput)
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

    // §6 seviye 7 (önce kontrol): Ürün cinsi "yazıcıya gönderme" diyor mu?
    if (product.productType?.skipPrinterOutput) {
      this.logger.log(`Product "${product.name}" → Cins "${product.productType.name}" skipPrinterOutput, gönderilmiyor`);
      return { profile: null, source: 'NO_OUTPUT', productId, productName: product.name };
    }

    // §6 seviye 1: Ürün kartına özel yazıcı / profil
    if (product.outputProfileId && product.outputProfileId > 0) {
      const cardProfile = product.outputProfile ||
        await this.loadProfile(product.outputProfileId);

      if (cardProfile) {
        if (cardProfile.noOutput) {
          this.logger.log(`Product "${product.name}" → Ürün Kartı Override → noOutput`);
          return { profile: null, source: 'NO_OUTPUT', productId, productName: product.name };
        }
        this.logger.log(`Product "${product.name}" → Ürün Kartı Override → Profile: "${cardProfile.name}"`);
        return { profile: cardProfile, source: 'PRODUCT_CARD', productId, productName: product.name };
      }
    }

    // §6 seviye 2: Ürün grubu (Department / productGroup) bazında override
    const productGroup = product.productGroup || product.category;
    if (productGroup) {
      const department = await this.departmentRepo.findOne({
        where: { name: productGroup },
        relations: ['outputProfile'],
      });

      if (department?.outputProfileId && department.outputProfileId > 0) {
        const groupProfile = department.outputProfile ||
          await this.loadProfile(department.outputProfileId);

        if (groupProfile) {
          if (groupProfile.noOutput) {
            this.logger.log(`Product "${product.name}" → Ürün Grubu "${department.name}" → noOutput`);
            return { profile: null, source: 'NO_OUTPUT', productId, productName: product.name };
          }
          this.logger.log(`Product "${product.name}" → Ürün Grubu Override (${department.name}) → Profile: "${groupProfile.name}"`);
          return { profile: groupProfile, source: 'PRODUCT_GROUP', productId, productName: product.name };
        }
      }
    }

    // §6 seviye 3: Ürün cinsi bazında çıktı profili
    if (product.productTypeId && product.productTypeId > 0) {
      const productType = product.productType ||
        await this.productTypeRepo.findOne({
          where: { id: product.productTypeId },
          relations: ['outputProfile'],
        });

      if (productType?.outputProfileId && productType.outputProfileId > 0) {
        const typeProfile = productType.outputProfile ||
          await this.loadProfile(productType.outputProfileId);

        if (typeProfile) {
          if (typeProfile.noOutput) {
            this.logger.log(`Product "${product.name}" → Ürün Cinsi "${productType.name}" → noOutput`);
            return { profile: null, source: 'NO_OUTPUT', productId, productName: product.name };
          }
          this.logger.log(`Product "${product.name}" → Ürün Cinsi (${productType.name}) → Profile: "${typeProfile.name}"`);
          return { profile: typeProfile, source: 'PRODUCT_TYPE', productId, productName: product.name };
        }
      }
    }

    // §6 seviye 4: direct_stock ürünlerde bağlı stok kartına özel yazıcı
    if (product.inventoryLinkType === 'direct_stock' && product.linkedStockCardId) {
      const stockCard = await this.stockCardRepo.findOne({
        where: { id: product.linkedStockCardId },
        relations: ['outputProfile'],
      });

      if (stockCard?.outputProfileId && stockCard.outputProfileId > 0) {
        const scProfile = stockCard.outputProfile ||
          await this.loadProfile(stockCard.outputProfileId);

        if (scProfile) {
          if (scProfile.noOutput) {
            this.logger.log(`Product "${product.name}" → Stok Kartı "${stockCard.name}" → noOutput`);
            return { profile: null, source: 'NO_OUTPUT', productId, productName: product.name };
          }
          this.logger.log(`Product "${product.name}" → Stok Kartı Override (${stockCard.name}) → Profile: "${scProfile.name}"`);
          return { profile: scProfile, source: 'STOCK_CARD', productId, productName: product.name };
        }
      }

      // §6 seviye 5: Bağlı stok grubuna özel yazıcı
      if (stockCard?.stockGroup) {
        const stockDept = await this.departmentRepo.findOne({
          where: { name: stockCard.stockGroup },
          relations: ['outputProfile'],
        });

        if (stockDept?.outputProfileId && stockDept.outputProfileId > 0) {
          const sgProfile = stockDept.outputProfile ||
            await this.loadProfile(stockDept.outputProfileId);

          if (sgProfile) {
            if (sgProfile.noOutput) {
              this.logger.log(`Product "${product.name}" → Stok Grubu "${stockCard.stockGroup}" → noOutput`);
              return { profile: null, source: 'NO_OUTPUT', productId, productName: product.name };
            }
            this.logger.log(`Product "${product.name}" → Stok Grubu Override (${stockCard.stockGroup}) → Profile: "${sgProfile.name}"`);
            return { profile: sgProfile, source: 'STOCK_GROUP', productId, productName: product.name };
          }
        }
      }
    }

    // §6 seviye 6: Varsayılan / uyarı
    this.logger.warn(`Product "${product.name}" → Tanımlı çıktı profili bulunamadı!`);
    return { profile: null, source: 'DEFAULT', productId, productName: product.name };
  }

  /**
   * OutputProfile yükle (relations ile)
   */
  private async loadProfile(profileId: number): Promise<OutputProfile | null> {
    return this.outputProfileRepo.findOne({
      where: { id: profileId },
      relations: ['mainPrinter', 'infoPrinter'],
    });
  }

  /**
   * Sipariş satırlarını hedeflerine göre gruplar.
   */
  async routeOrderItems(items: any[]): Promise<RoutedGroup[]> {
    const groupMap = new Map<number | string, RoutedGroup>();

    for (const item of items) {
      const resolved = await this.resolveOutputProfile(item.productId);

      if (!resolved.profile) {
        // Tanımsız profil veya noOutput — skip
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
        categoryName: product.productGroup || '-',
        inventoryLinkType: product.inventoryLinkType || 'none',
        hasCardOverride: !!(product.outputProfileId && product.outputProfileId > 0),
        hasGroupOverride: false,
        effectiveProfileName: resolved.profile?.name || (resolved.source === 'NO_OUTPUT' ? 'ÇIKTI YOK' : 'TANIMSIZ'),
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
