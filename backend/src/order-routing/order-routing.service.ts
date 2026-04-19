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
   * 2. direct_stock ürünlerde bağlı stok kartına özel yazıcı (stockCard.outputProfileId)
   * 3. Ürün grubuna özel yazıcı (department.outputProfileId - category/productGroup eşleşmesi)
   * 4. Bağlı stok grubuna özel yazıcı (stockCard.stockGroup → department eşleşmesi)
   * 5. Ürün cinsine özel yazıcı (productType.outputProfileId)
   * 6. Hiçbir tanım yoksa varsayılan yazıcı
   * 7. "Yazıcıya gönderme" kuralı (productType.skipPrinterOutput || profile.noOutput)
   *
   * Not: Döküman bölüm 14.5 ile uyumludur.
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

    // 1. Ürün (Product) bazında override
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

    // Direkt Stok kontrolü için stok kartını hazırla
    let stockCard: StockCard | null = null;
    if (product.inventoryLinkType === 'direct_stock' && product.linkedStockCardId) {
      stockCard = await this.stockCardRepo.findOne({
        where: { id: product.linkedStockCardId },
        relations: ['outputProfile'],
      });
    }

    // 2. Stok Kartı (Stock) bazında override (direct_stock ise)
    if (stockCard && stockCard.outputProfileId && stockCard.outputProfileId > 0) {
      const stockProfile = stockCard.outputProfile ||
        await this.loadProfile(stockCard.outputProfileId);

      if (stockProfile) {
        if (stockProfile.noOutput) {
          this.logger.log(`Product "${product.name}" → Stok Kartı Override → noOutput`);
          return { profile: null, source: 'NO_OUTPUT', productId, productName: product.name };
        }
        this.logger.log(`Product "${product.name}" → Stok Kartı Override → Profile: "${stockProfile.name}"`);
        return { profile: stockProfile, source: 'STOCK_CARD', productId, productName: product.name };
      }
    }

    // 3. Ürün Grubu (Department / productGroup) bazında override
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

    // 4. Stok Grubu bazında override (stockCard.stockGroup === department.name)
    if (stockCard && stockCard.stockGroup) {
      const department = await this.departmentRepo.findOne({
        where: { name: stockCard.stockGroup },
        relations: ['outputProfile'],
      });

      if (department && department.outputProfileId && department.outputProfileId > 0) {
        const groupProfile = department.outputProfile ||
          await this.loadProfile(department.outputProfileId);

        if (groupProfile) {
          if (groupProfile.noOutput) {
            this.logger.log(`Product "${product.name}" → Stok Grubu "${stockCard.stockGroup}" → noOutput`);
            return { profile: null, source: 'NO_OUTPUT', productId, productName: product.name };
          }
          this.logger.log(`Product "${product.name}" → Stok Grubu Override (${stockCard.stockGroup}) → Profile: "${groupProfile.name}"`);
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

    // 6. Varsayılan
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

   * Kontrol listesi: ürün → etkin profil + kaynak bilgisi.
   * Döküman bölüm 14.5.
   * Performans Optimizasyonu: N+1 sorgu problemini engellemek için bulk DB fetch ve memory-based çözümleme kullanır.
   */
  async getRoutingControlList(): Promise<RoutingControlEntry[]> {
    // Tüm ilgili tabloları tek seferde (batch) çek
    const [products, departments, stockCards, productTypes, outputProfiles] = await Promise.all([
      this.productRepo.find(),
      this.departmentRepo.find(),
      this.stockCardRepo.find(),
      this.productTypeRepo.find(),
      this.outputProfileRepo.find()
    ]);

    // Hızlı erişim için Map'ler oluştur
    const profileMap = new Map<number, string>();
    for (const op of outputProfiles) {
      profileMap.set(op.id, op.name);
    }

    const deptMap = new Map<string, Department>();
    for (const d of departments) {
      if (d.name) deptMap.set(d.name, d);
    }

    const stockCardMap = new Map<number, StockCard>();
    for (const sc of stockCards) {
      stockCardMap.set(sc.id, sc);
    }

    const pTypeMap = new Map<number, ProductType>();
    for (const pt of productTypes) {
      pTypeMap.set(pt.id, pt);
    }
    }

    const deptOverrides = new Set(
      departments
        .filter(d => d.outputProfileId && d.outputProfileId > 0)
        .map(d => d.name)
    );

    const result: RoutingControlEntry[] = [];

    for (const product of products) {
      let effectiveProfileName = 'TANIMSIZ';
      let effectiveSource = 'DEFAULT';
      
      const stockCard = (product.inventoryLinkType === 'direct_stock' && product.linkedStockItemId) 
        ? stockCardMap.get(product.linkedStockItemId) || null 
        : null;

      const pType = product.productTypeId ? pTypeMap.get(product.productTypeId) : null;

      // 1. Ürün (Product) Override
      if (product.outputProfileId && product.outputProfileId > 0 && profileMap.has(product.outputProfileId)) {
        effectiveProfileName = profileMap.get(product.outputProfileId)!;
        effectiveSource = 'STOCK_CARD';
      }
      // 2. Stok Kartı (Stock) Override
      else if (stockCard && stockCard.outputProfileId && stockCard.outputProfileId > 0 && profileMap.has(stockCard.outputProfileId)) {
        effectiveProfileName = profileMap.get(stockCard.outputProfileId)!;
        effectiveSource = 'STOCK_CARD';
      }
      // 3. Ürün Grubu (Product Group) Override
      else if (product.category && deptMap.has(product.category) && deptMap.get(product.category)!.outputProfileId && profileMap.has(deptMap.get(product.category)!.outputProfileId)) {
        const pId = deptMap.get(product.category)!.outputProfileId;
        effectiveProfileName = profileMap.get(pId)!;
        effectiveSource = 'STOCK_GROUP';
      }
      // 4. Stok Grubu (Stock Group) Override
      else if (stockCard && stockCard.stockGroup && deptMap.has(stockCard.stockGroup) && deptMap.get(stockCard.stockGroup)!.outputProfileId && profileMap.has(deptMap.get(stockCard.stockGroup)!.outputProfileId)) {
        const pId = deptMap.get(stockCard.stockGroup)!.outputProfileId;
        effectiveProfileName = profileMap.get(pId)!;
        effectiveSource = 'STOCK_GROUP';
      }
      // 5. Ürün Cinsi (Product Type) Override
      else if (pType && pType.outputProfileId && pType.outputProfileId > 0 && profileMap.has(pType.outputProfileId)) {
        effectiveProfileName = profileMap.get(pType.outputProfileId)!;
        effectiveSource = 'PRODUCT_TYPE';
      }

      result.push({
        productId: product.id,
        productName: product.name,
        productTypeName: pType?.name || 'Tanımsız',
        categoryName: product.category || '-',
        hasCardOverride: !!(product.outputProfileId && product.outputProfileId > 0),
        hasGroupOverride: product.category ? deptOverrides.has(product.category) : false,
        effectiveProfileName,
        effectiveSource,
      });
    }

    return result;
  }
}
