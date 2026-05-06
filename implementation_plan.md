# Restoran Modülü – Set Menü / Fix Menü / Kampanya Seti Entegrasyon Planı

## Hedef Özeti (Goal Description)
Sistemde birden fazla, karmaşık ve eski tip "hak/adet dağıtma" set mantıklarını kaldırıp, tek bir güçlü "Paket/Set Motoru" (Fix Menü, Seçmeli Menü, Kampanya/Bundle Set) altyapısı kurmak. Bu motor sayesinde garson satış ekranında setleri tek kalem gibi satabilecek; arka planda operasyon (mutfak, bar, KDS), marş/beklet (hold/fire) işlemleri alt ürünler bazında ayrı ayrı çalıştırılabilecektir. Stok ve raporlama da ağırlıklı alt ürün bazında yapılacaktır. Sipariş oluşturulduktan sonra Set içerikleri parçalanamayacak, iptal/iade işlemleri Set'in bütünü üzerinden yapılacaktır.

## User Review Required
> [!IMPORTANT]
> Kullanıcı Onayı Gereken Konular:
> - **Veri Modeli:** Önerilen 3 yeni Set tablosu (`SetMenu`, `SetGroup`, `SetGroupItem`) işleyiş için yeterli midir?
> - **İptal / İade:** Alt ürünlerin iptal/iade süreçlerinde bağımsız olarak değil, ana set (parent) ile birlikte toplu olarak iptal/iade edileceği kuralı uygun mudur?
> - **Fazlama:** Ücretsiz limit (free quota) vb. gelişmiş yapıların Prompta uygun olarak "1. Faz" (temel set çalışma prensibi), "2. Faz" (ücretsiz hak limitleri vb.) şeklinde ayrılması onaylanıyor mu?

## Önerilen Değişiklikler (Proposed Changes)

### Veritabanı ve Backend Değişiklikleri

Yeni paket motorunun çalışması için ürün kartını (Product) genişleten SetMenu yapıları eklenecektir.

#### [NEW] backend/src/products/entities/set-menu.entity.ts
Yeni SetMenu tablosunun eklenmesi.
*Tanımlanacak Alanlar:*
- `id`: Primary Key
- `productId`: FK (Hangi ürüne bağlı olduğu)
- `setType`: Enum ('FIX', 'CHOICE', 'BUNDLE')
- `isActive`: Boolean
- `showAsParent`: Boolean (Satışta üst ürün olarak görünsün mü)
- `splitToSubItems`: Boolean (Siparişte alt ürünlere ayrılsın mı)

#### [NEW] backend/src/products/entities/set-group.entity.ts
Set içindeki seçim gruplarının tanımlanması.
*Tanımlanacak Alanlar:*
- `id`: Primary Key
- `setMenuId`: FK
- `groupName`: String (Örn: Çorbalar, İçecekler)
- `minSelect`: Integer
- `maxSelect`: Integer
- `selectionSource`: Enum ('CATEGORY', 'PRODUCT')

#### [NEW] backend/src/products/entities/set-group-item.entity.ts
Gruba dahil edilen ürün veya kategorilerin tutulması.
*Tanımlanacak Alanlar:*
- `id`: Primary Key
- `setGroupId`: FK
- `productId` (veya `categoryId`): Hangi ürünün/kategorinin seçildiği
- `priceMode`: Enum ('INCLUDED', 'DIFF_PRICE', 'FIXED_ADD')
- `priceDiff`: Decimal (Fiyat farkı değeri)
- `isDefault`: Boolean
- `isActive`: Boolean

#### [MODIFY] backend/src/products/entities/product.entity.ts
- Ürün tablosuna SetMenu ile `OneToOne` ilişki eklenmesi (Bir ürün Set ise detayları SetMenu'den alınır).
- Ürün tipini "SET" olarak belirten type ('NORMAL', 'SET') flag/kolon eklenmesi.

#### [MODIFY] backend/src/sales/sale-item.entity.ts
- Sistem altyapısında zaten `parentItemId` ve `menuGroupId` hazır tutuluyor. Bunların aktif olarak tüm query'lerde dikkate alınması sağlanacak.
- Set bütünlüğü kuralı gereğince: Yeni logic'te `parentItemId` silinmeden veya iptal edilmeden alt [SaleItem](file:///c:/Github/POSSAPP/POSAPP/backend/src/sales/sale-item.entity.ts#10-84)lerin bağımsız iptaline engel olunması (satırların birleşik çalışması).

#### [MODIFY] backend/src/sales/sales.service.ts
- `createSaleItem` veya `addItemToList` metotlarına SET logic'inin dahil edilmesi.
  - Fix Menü eklendiğinde API, ürünün alt Set Group içeriklerini çekerek (varsayılanları alarak) doğrudan parent-child kayıt yaratmalıdır.
  - Seçmeli / Bundle Menü eklendiğinde, önyüzden (Frontend) gelen "seçimler dizisi" işlenip, sepete child itemler olarak kaydedilmeli ve hepsine main itemin IDsinden `parentItemId` atanmalıdır.
- Marş / Hold Logic ([sales.service.ts](file:///c:/Github/POSSAPP/POSAPP/backend/src/sales/sales.service.ts) / marş işlemleri fonksiyonu): İşlemlerin Parent'a değil, child bazında yapılabilmesinin ve servis validation'ının (Eğer set ise marş edilebilir mi kontrolü vs.) eklenmesi.

---

### Arayüz (Frontend - Admin Paneli)

#### [NEW] frontend/src/app/[locale]/admin/products/set-menus
- POS Yöneticisi için yeni oluşturulacak Set tanımlama arabirimi.
- Kullanım Akışı: 
  1. Set Adı/Tipi girilir.
  2. Fiyat Girilir.
  3. Grup Ekle butonuna basılır.
  4. Grup için zorunluluk (min/max) belirlenir.
  5. Seçim Kaynağı (Kategori/Ürün) seçilir, listeye ürünler atılır.
  6. Kaydedilir.

---

### Arayüz (Frontend - Sipariş Ekranları: POS & TakeOrder)

Garsonun sipariş kullanımı eski sisteme göre (hak/adet dağıtma olmadan) net kurallı olmalıdır.

#### [NEW] frontend/src/components/SetMenuSelectionModal.tsx
- Garson, bir "Seçmeli Menü" veya "Kampanya/Bundle" seçtiğinde açılacak özel Popup (Modal).
- Modalda Set'e ait "Gruplar" UI üzerinde net ayrılmış bölgelerde/sekmelerde listelenecek (Örn: "Çorba", "İçecek").
- Her grup bazında backend'deki `minSelect` ve `maxSelect` validasyonu client-side olarak yapılacak.
- **Kritik UI Kuralı:** Zorunlu gruplar (minSelect > 0) tamamlanmadan modal altındaki "Sepete Ekle" butonu `disabled` (inaktif) olacak.

#### [MODIFY] frontend/src/app/[locale]/pos/PosView.tsx & take-order/TakeOrderView.tsx
- Ürün grid'inden bir "SET" ürününe tıklandığında;
  - **Eğer Fix Menü ise:** Popup açılmayacak, sepet servisine direkt `parentItem` ve default `child` itemler ile eklenecek.
  - **Eğer Seçmeli/Kampanya Menü ise:** `SetMenuSelectionModal` açılacak ve garson şeffaf şekilde seçim yapacak.

#### [MODIFY] frontend/src/components/PosBasket.tsx
- Sepet görünümünde Parent Set'in tek kalem (Örn: **Tavuk Menü** 1x - 300 TL) şeklinde gösterilmesi.
- Alt ürünlerin hiyerarşik veya girintili gösterimi (Örn: *- Mercimek Çorba, - Tavuk Şiş, - Cola*).
- **Marş / Beklet (Hold) Operasyonu UI:** Alt ürünlere tıklandığında (veya parent'ta özel bir buton tıklandığında açılan menü üzerinden) sadece istenen alt ürünü marş etme (fire) veya bekletme (hold) yetkisinin önyüze eklenmesi. İptal/İade fonksiyonlarının ise yalnızca Parent Set satırından yapılabilir hale getirilmesi.

---

## Doğrulama Planı (Verification Plan)

### Manuel Doğrulama Adımları (Manual Verification)
Değişikliklerin doğruluğu aşağıdaki senaryolarla manuel olarak test edilecektir:

1. **Fix Menü Sepete Ekleme Testi:** 
   - Test Adımı: Garson satış grid'inden "Köfte Menü" seçer.
   - Beklenen Sonuç: Seçim ekranı (modal) açılmaz, ürün doğrudan sepete eklenir. Sepet görünümünde ana ürün görünürken veritabanı loglarında (veya sepet alt detayında) Çorba, Köfte gibi alt ürünler eklenmiş olmalıdır.
2. **Seçmeli Menü Zorunluluk Testi:**
   - Test Adımı: Garson "Tavuk Menü" (Zorunlu çorba + içecekli) seçer. Çorba seçimi yapmadan Ekle butonuna tıklar.
   - Beklenen Sonuç: "Sepete Ekle" butonu inaktif kalır ve/veya uyarı çıkar. Çorbalar ve İçecekler seçildikten sonra buton aktif olup ürün sepete aktarılır.
3. **Kampanya (Bundle) Çoklu Kural Testi:**
   - Test Adımı: 1 Şişe Votka + 4 Soft İçecek (min: 0, max: 4) bundle menü seçilir. 5. içecek seçilmeye çalışılır.
   - Beklenen Sonuç: Sistemin 5. seçime imkan vermemesi veya onu farklı ücretli göstermesi/engellemesi gerekir.
4. **Hold/Marş Testi (KDS Uyumluluğu):**
   - Test Adımı: Sepetteki "Köfte Menü" altındaki "Köfte" beklet (Hold) yapılır. Çorba ve Kola normal olarak bırakılır. Sipariş gönderilir.
   - Beklenen Sonuç: Mutfak (KDS) test ekranında Çorba marş edilmiş olarak görünürken, Köfte "Beklemekte/Hold" statüsünde olmalıdır.
5. **İptal Bütünlüğü Testi:**
   - Test Adımı: Okeylenmiş bir Set Menünün sadece Çorba alt ürününü iptal etmeye çalışın.
   - Beklenen Sonuç: İzin verilmez. İşlem sadece ana Menü satırından "İptal/İade" butonu aracılığıyla tümü iptal edilecek şekilde tamamlanabilir.

### Otomatize Testler (Automated Tests)
- Yeni backend API endpoint'lerine (`POST /api/sales/set-menu`) gönderilen `SetType: CHOICE` test verisinde `minSelect` koşulunun kasten yerine getirilmeden Request yapılması ve servisin 400 Bad Request / Validation mesajı dönmesinin doğrulanması için Integration Test eklenecektir. (Komut: `npm run test:e2e` veya Test Script dosyası kullanılarak).
