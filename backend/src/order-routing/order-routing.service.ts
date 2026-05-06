import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/product.entity';
import { ProductType } from '../product-types/product-type.entity';
import { OutputProfile } from '../output-profiles/output-profile.entity';
import { Department } from '../departments/department.entity';
import { SaleItem } from '../sales/sale-item.entity';
import { StockCard } from '../stock-cards/stock-card.entity';
import { ZoneMapping } from '../zones/zone-mapping.entity';

export interface ResolvedRoute {
  profile: OutputProfile | null;
  source: 'STOCK_CARD' | 'STOCK_GROUP' | 'PRODUCT_TYPE' | 'DEFAULT';
  productId: number;
  productName: string;
}

export interface RoutedGroup {
  profile: OutputProfile | null;
  zoneMapping: ZoneMapping | null;
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

    @InjectRepository(StockCard)
    private readonly stockCardRepo: Repository<StockCard>,

    @InjectRepository(ZoneMapping)
    private readonly zoneMappingRepo: Repository<ZoneMapping>,
  ) {}

  /**
   * Bir ürün için etkin çıktı profilini belirler.
   * Öncelik sırası (12.md - 14.5):
   * 1. Ürün (Product) Override: product.outputProfileId
   * 2. Stok Kartı (Stock) Override: product.linkedStockItemId -> stockCard.outputProfileId (Eğer direct_stock ise)
   * 3. Ürün Grubu (Product Group) Override: product.category -> department.name
   * 4. Stok Grubu (Stock Group) Override: stockCard.stockGroup -> department.name (Eğer direct_stock ise)
   * 5. Ürün Cinsi (Product Type) Override: product.productTypeId -> productType.outputProfileId
   * 6. Varsayılan (Bölüm/Mutfak)
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

    // 1. Ürün (Product) bazında override
    if (product.outputProfileId && product.outputProfileId > 0) {
      const cardProfile = product.outputProfile ||
        await this.outputProfileRepo.findOne({
          where: { id: product.outputProfileId },
          relations: ['mainPrinter', 'infoPrinter'],
        });

      if (cardProfile) {
        return { profile: cardProfile, source: 'STOCK_CARD', productId, productName: product.name };
      }
    }

    // Direkt Stok kontrolü için stok kartını hazırla
    let stockCard: StockCard | null = null;
    if (product.inventoryLinkType === 'direct_stock' && product.linkedStockItemId) {
      stockCard = await this.stockCardRepo.findOne({
        where: { id: product.linkedStockItemId },
        relations: ['outputProfile'],
      });
    }

    // 2. Stok Kartı (Stock) bazında override
    if (stockCard && stockCard.outputProfileId && stockCard.outputProfileId > 0) {
      const stockProfile = stockCard.outputProfile ||
        await this.outputProfileRepo.findOne({
          where: { id: stockCard.outputProfileId },
          relations: ['mainPrinter', 'infoPrinter'],
        });
      if (stockProfile) {
        return { profile: stockProfile, source: 'STOCK_CARD', productId, productName: product.name };
      }
    }

    // 3. Ürün Grubu bazında override (product.category === department.name)
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
          return { profile: groupProfile, source: 'STOCK_GROUP', productId, productName: product.name };
        }
      }
    }

    // 4. Stok Grubu bazında override (stockCard.stockGroup === department.name)
    if (stockCard && stockCard.stockGroup) {
      const department = await this.departmentRepo.findOne({
        where: { name: stockCard.stockGroup },
        relations: ['outputProfile'],
      });

      if (department && department.outputProfileId && department.outputProfileId > 0) {
        const groupProfile = department.outputProfile ||
          await this.outputProfileRepo.findOne({
            where: { id: department.outputProfileId },
            relations: ['mainPrinter', 'infoPrinter'],
          });
        if (groupProfile) {
          return { profile: groupProfile, source: 'STOCK_GROUP', productId, productName: product.name };
        }
      }
    }

    // 5. Ürün Cinsi (Cins) bazında çıktı profili
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
          return { profile: typeProfile, source: 'PRODUCT_TYPE', productId, productName: product.name };
        }
      }
    }

    // 6. Varsayılan
    return { profile: null, source: 'DEFAULT', productId, productName: product.name };
  }

  /**
   * Sipariş satırlarını hedeflerine göre gruplar.
   * Her grup: yazıcı hedefi, KDS hedefi, bilgi yazıcısı bilgisi
   */
  async routeOrderItems(items: any[], zoneId?: number): Promise<RoutedGroup[]> {
    const groupMap = new Map<string, RoutedGroup>();

    // Eğer zoneId varsa, mappingleri baştan çekelim
    let zoneMappings: ZoneMapping[] = [];
    if (zoneId) {
      zoneMappings = await this.zoneMappingRepo.find({
        where: { zoneId },
        relations: ['outputProfile', 'outputProfile.mainPrinter', 'outputProfile.infoPrinter', 'productType'],
      });
    }

    for (const item of items) {
      const resolved = await this.resolveOutputProfile(item.productId);
      
      let mapping: ZoneMapping | null = null;

      // 1. Ürün Cinsi bul
      const product = await this.productRepo.findOne({ where: { id: item.productId } });
      const pTypeId = product?.productTypeId;

      // 2. ZoneMapping kontrolü yap (sadece zoneId varsa ve bu ürünün cinsi varsa)
      if (zoneId && pTypeId && zoneMappings.length > 0) {
        mapping = zoneMappings.find(m => m.productTypeId === pTypeId) || null;
      }

      let activeProfile = resolved.profile;
      let activeSource: string = resolved.source;

      if (mapping && mapping.outputProfile) {
        activeProfile = mapping.outputProfile;
        activeSource = 'ZONE_MAPPING';
      }

      if (!activeProfile) {
        // Tanımsız profil — uyarı loglandı, skip
        continue;
      }

      if (activeProfile.noOutput) {
        // Çıktı dışı profil — hiçbir yere gönderilmez
        this.logger.log(`Product "${resolved.productName}" → noOutput, atlanıyor`);
        continue;
      }

      // Gruplama anahtarı: profil ID'si
      const key = `profile_${activeProfile.id}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          profile: activeProfile,
          zoneMapping: mapping,
          items: [],
          source: activeSource,
        });
      }

      groupMap.get(key)!.items.push({
        ...item,
        productName: resolved.productName,
        routeSource: activeSource,
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
