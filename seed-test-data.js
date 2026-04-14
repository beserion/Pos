// Test verisi ekleme scripti
const API = 'http://127.0.0.1:3050';

async function main() {
  const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluQGFkbWluLmNvbSIsInN1YiI6MSwicm9sZSI6IkFkbWluIiwiY2FzaFJlZ2lzdGVySWQiOm51bGwsImlhdCI6MTc3NTA3NjkzOSwiZXhwIjoxNzc1MTYzMzM5fQ.IVKK65PuRQ79gXwdAS8N-WEtdKCDHtsM9dU-mlFVULU';
  console.log('✅ Token hazır');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`
  };

  // 2. Mevcut product types kontrol
  let existingTypes = await fetch(`${API}/product-types`, { headers }).then(r => r.json());
  if (!Array.isArray(existingTypes)) existingTypes = [];

  const typeNames = ['İçecek', 'Alkollü İçecek', 'Alkolsüz İçecek', 'Sıcak İçecek', 'Yiyecek', 'Tatlı', 'Kahvaltı', 'Market Ürünü', 'Servis / Ücret', 'Diğer'];
  const typeMap = {};

  for (const name of typeNames) {
    const exists = existingTypes.find(t => t.name === name);
    if (exists) {
      typeMap[name] = exists.id;
    } else {
      const res = await fetch(`${API}/product-types`, {
        method: 'POST', headers,
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      typeMap[name] = data.id;
    }
  }
  console.log('✅ Ürün Cinsleri Güncel');

  // Stok Kartları
  const stockCards = [
    { name: 'Kola 330ml', code: 'SC-KOLA330', stockGroup: 'Meşrubatlar', category: 'Gazlı İçecekler' },
    { name: 'Fanta 330ml', code: 'SC-FANTA330', stockGroup: 'Meşrubatlar', category: 'Gazlı İçecekler' },
    { name: 'Sprite 330ml', code: 'SC-SPRITE330', stockGroup: 'Meşrubatlar', category: 'Gazlı İçecekler' },
    { name: 'Ayran', code: 'SC-AYRAN', stockGroup: 'Meşrubatlar', category: 'Süt Ürünleri İçecek' },
    { name: 'Soda', code: 'SC-SODA', stockGroup: 'Meşrubatlar', category: 'Gazlı İçecekler' },
    { name: 'Portakal Suyu', code: 'SC-POR-SUYU', stockGroup: 'Meyve Suları', category: 'Taze Sıkım' },
    { name: 'Elma Suyu', code: 'SC-ELMA-SUYU', stockGroup: 'Meyve Suları', category: 'Hazır Paket' },
    { name: 'Limonata', code: 'SC-LIMONATA', stockGroup: 'Meyve Suları', category: 'Taze Sıkım' },
    { name: 'Türk Kahvesi', code: 'SC-TURKKAHVESI', stockGroup: 'Kahveler', category: 'Türk Kahvesi' },
    { name: 'Espresso', code: 'SC-ESPRESSO', stockGroup: 'Kahveler', category: 'Espresso Bazlı' },
    { name: 'Latte', code: 'SC-LATTE', stockGroup: 'Kahveler', category: 'Espresso Bazlı' },
    { name: 'Cappuccino', code: 'SC-CAPPUCCINO', stockGroup: 'Kahveler', category: 'Espresso Bazlı' },
    { name: 'Americano', code: 'SC-AMERICANO', stockGroup: 'Kahveler', category: 'Espresso Bazlı' },
    { name: 'Çay', code: 'SC-CAY', stockGroup: 'Çaylar', category: 'Sıcak Çay' },
    { name: 'Yeşil Çay', code: 'SC-YESIL-CAY', stockGroup: 'Çaylar', category: 'Bitki Çayları' },
    { name: 'Papatya Çayı', code: 'SC-PAPATYA', stockGroup: 'Çaylar', category: 'Bitki Çayları' },
    { name: 'Bira Efes', code: 'SC-BIRA-EFES', stockGroup: 'Biralar', category: 'Yerli Bira' },
    { name: 'Bira Heineken', code: 'SC-BIRA-HEIN', stockGroup: 'Biralar', category: 'İthal Bira' },
    { name: 'Rakı', code: 'SC-RAKI', stockGroup: 'Distile', category: 'Rakı' },
    { name: 'Votka Absolut', code: 'SC-VOTKA', stockGroup: 'Distile', category: 'Votka' },
    { name: 'Cin', code: 'SC-CIN', stockGroup: 'Distile', category: 'Cin' },
    { name: 'Kırmızı Şarap', code: 'SC-KIRMIZI-SARAP', stockGroup: 'Şaraplar', category: 'Red Wine' },
    { name: 'Beyaz Şarap', code: 'SC-BEYAZ-SARAP', stockGroup: 'Şaraplar', category: 'White Wine' },
    { name: 'Karışık Izgara', code: 'SC-KARISIK-IZGARA', stockGroup: 'Izgaralar', category: 'Et Izgara' },
    { name: 'Tavuk Şiş', code: 'SC-TAVUK-SIS', stockGroup: 'Izgaralar', category: 'Tavuk Izgara' },
    { name: 'Adana Kebap', code: 'SC-ADANA', stockGroup: 'Izgaralar', category: 'Et Izgara' },
    { name: 'Urfa Kebap', code: 'SC-URFA', stockGroup: 'Izgaralar', category: 'Et Izgara' },
    { name: 'Caesar Salata', code: 'SC-CAESAR', stockGroup: 'Salatalar', category: 'Salata' },
    { name: 'Mevsim Salata', code: 'SC-MEVSIM', stockGroup: 'Salatalar', category: 'Salata' },
    { name: 'Sezar Wrap', code: 'SC-WRAP', stockGroup: 'Sandviçler', category: 'Wrap' },
    { name: 'Hamburger', code: 'SC-HAMBURGER', stockGroup: 'Burgerler', category: 'Klasik' },
    { name: 'Cheeseburger', code: 'SC-CHEESEBURGER', stockGroup: 'Burgerler', category: 'Klasik' },
    { name: 'Patates Kızartması', code: 'SC-PATATES', stockGroup: 'Yan Lezzetler', category: 'Kızartmalar' },
    { name: 'Soğan Halkası', code: 'SC-SOGAN', stockGroup: 'Yan Lezzetler', category: 'Kızartmalar' },
    { name: 'Künefe', code: 'SC-KUNEFE', stockGroup: 'Sıcak Tatlılar', category: 'Şerbetli' },
    { name: 'Sütlaç', code: 'SC-SUTLAC', stockGroup: 'Soğuk Tatlılar', category: 'Sütlü' },
    { name: 'Profiterol', code: 'SC-PROFITEROL', stockGroup: 'Soğuk Tatlılar', category: 'Çikolatalı' },
    { name: 'Baklava', code: 'SC-BAKLAVA', stockGroup: 'Sıcak Tatlılar', category: 'Şerbetli' },
    { name: 'Cheesecake', code: 'SC-CHEESECAKE', stockGroup: 'Soğuk Tatlılar', category: 'Pasta' },
    { name: 'Tiramisu', code: 'SC-TIRAMISU', stockGroup: 'Soğuk Tatlılar', category: 'Pasta' },
    { name: 'Serpme Kahvaltı', code: 'SC-SERPME', stockGroup: 'Kahvaltı Tabakları', category: 'Kahvaltı Tabağı' },
    { name: 'Omlet', code: 'SC-OMLET', stockGroup: 'Kahvaltı Sıcakları', category: 'Yumurta' },
    { name: 'Menemen', code: 'SC-MENEMEN', stockGroup: 'Kahvaltı Sıcakları', category: 'Yumurta' },
    { name: 'Sucuklu Yumurta', code: 'SC-SUCUKLU', stockGroup: 'Kahvaltı Sıcakları', category: 'Yumurta' },
    { name: 'Sahanda Yumurta', code: 'SC-SAHANDA', stockGroup: 'Kahvaltı Sıcakları', category: 'Yumurta' }
  ];

  const scMap = {};
  let existingSC = await fetch(`${API}/stock-cards`, { headers }).then(r => r.json());
  if (!Array.isArray(existingSC)) existingSC = [];

  for (const sc of stockCards) {
    const exists = existingSC.find(e => e.code === sc.code);
    if (exists) {
      scMap[sc.code] = exists.id;
    } else {
      const res = await fetch(`${API}/stock-cards`, {
        method: 'POST', headers,
        body: JSON.stringify({ ...sc, baseUnit: 'adet', isActive: true, stockNature: 'traded_good' })
      });
      if (res.ok) {
        const data = await res.json();
        scMap[sc.code] = data.id;
      }
    }
  }
  console.log('✅ Stok Kartları Güncel');

  const productsToCreate = [
    { name: 'Kola', sku: 'P-KOLA', price: 45, category: 'Alkolsüz İçecek', productTypeId: typeMap['Alkolsüz İçecek'], linkedStockCode: 'SC-KOLA330' },
    { name: 'Fanta', sku: 'P-FANTA', price: 45, category: 'Alkolsüz İçecek', productTypeId: typeMap['Alkolsüz İçecek'], linkedStockCode: 'SC-FANTA330' },
    { name: 'Sprite', sku: 'P-SPRITE', price: 45, category: 'Alkolsüz İçecek', productTypeId: typeMap['Alkolsüz İçecek'], linkedStockCode: 'SC-SPRITE330' },
    { name: 'Ayran', sku: 'P-AYRAN', price: 30, category: 'Alkolsüz İçecek', productTypeId: typeMap['Alkolsüz İçecek'], linkedStockCode: 'SC-AYRAN' },
    { name: 'Soda', sku: 'P-SODA', price: 25, category: 'Alkolsüz İçecek', productTypeId: typeMap['Alkolsüz İçecek'], linkedStockCode: 'SC-SODA' },
    { name: 'Taze Portakal Suyu', sku: 'P-PORTAKAL', price: 65, category: 'Alkolsüz İçecek', productTypeId: typeMap['Alkolsüz İçecek'], linkedStockCode: 'SC-POR-SUYU' },
    { name: 'Elma Suyu', sku: 'P-ELMA-SUYU', price: 40, category: 'Alkolsüz İçecek', productTypeId: typeMap['Alkolsüz İçecek'], linkedStockCode: 'SC-ELMA-SUYU' },
    { name: 'Ev Yapımı Limonata', sku: 'P-LIMONATA', price: 55, category: 'Alkolsüz İçecek', productTypeId: typeMap['Alkolsüz İçecek'], linkedStockCode: 'SC-LIMONATA' },
    { name: 'Türk Kahvesi', sku: 'P-TURKKAHVE', price: 50, category: 'Sıcak İçecek', productTypeId: typeMap['Sıcak İçecek'], linkedStockCode: 'SC-TURKKAHVESI' },
    { name: 'Espresso', sku: 'P-ESPRESSO', price: 55, category: 'Sıcak İçecek', productTypeId: typeMap['Sıcak İçecek'], linkedStockCode: 'SC-ESPRESSO' },
    { name: 'Latte', sku: 'P-LATTE', price: 70, category: 'Sıcak İçecek', productTypeId: typeMap['Sıcak İçecek'], linkedStockCode: 'SC-LATTE' },
    { name: 'Cappuccino', sku: 'P-CAPPUCCINO', price: 70, category: 'Sıcak İçecek', productTypeId: typeMap['Sıcak İçecek'], linkedStockCode: 'SC-CAPPUCCINO' },
    { name: 'Americano', sku: 'P-AMERICANO', price: 60, category: 'Sıcak İçecek', productTypeId: typeMap['Sıcak İçecek'], linkedStockCode: 'SC-AMERICANO' },
    { name: 'Çay', sku: 'P-CAY', price: 20, category: 'Sıcak İçecek', productTypeId: typeMap['Sıcak İçecek'], linkedStockCode: 'SC-CAY' },
    { name: 'Yeşil Çay', sku: 'P-YESIL-CAY', price: 35, category: 'Sıcak İçecek', productTypeId: typeMap['Sıcak İçecek'], linkedStockCode: 'SC-YESIL-CAY' },
    { name: 'Papatya Çayı', sku: 'P-PAPATYA', price: 35, category: 'Sıcak İçecek', productTypeId: typeMap['Sıcak İçecek'], linkedStockCode: 'SC-PAPATYA' },
    { name: 'Efes Pilsen', sku: 'P-EFES', price: 90, category: 'Alkollü İçecek', productTypeId: typeMap['Alkollü İçecek'], linkedStockCode: 'SC-BIRA-EFES' },
    { name: 'Heineken', sku: 'P-HEINEKEN', price: 120, category: 'Alkollü İçecek', productTypeId: typeMap['Alkollü İçecek'], linkedStockCode: 'SC-BIRA-HEIN' },
    { name: 'Rakı (Tek)', sku: 'P-RAKI-TEK', price: 150, category: 'Alkollü İçecek', productTypeId: typeMap['Alkollü İçecek'], linkedStockCode: 'SC-RAKI' },
    { name: 'Votka (Tek)', sku: 'P-VOTKA-TEK', price: 130, category: 'Alkollü İçecek', productTypeId: typeMap['Alkollü İçecek'], linkedStockCode: 'SC-VOTKA' },
    { name: 'Cin Tonik', sku: 'P-CIN-TONIK', price: 140, category: 'Alkollü İçecek', productTypeId: typeMap['Alkollü İçecek'], linkedStockCode: 'SC-CIN' },
    { name: 'Kırmızı Şarap (Kadeh)', sku: 'P-KIRMIZI-KADEH', price: 110, category: 'Alkollü İçecek', productTypeId: typeMap['Alkollü İçecek'], linkedStockCode: 'SC-KIRMIZI-SARAP' },
    { name: 'Beyaz Şarap (Kadeh)', sku: 'P-BEYAZ-KADEH', price: 110, category: 'Alkollü İçecek', productTypeId: typeMap['Alkollü İçecek'], linkedStockCode: 'SC-BEYAZ-SARAP' },
    { name: 'Karışık Izgara', sku: 'P-KARISIK', price: 350, category: 'Yiyecek', productTypeId: typeMap['Yiyecek'], linkedStockCode: 'SC-KARISIK-IZGARA' },
    { name: 'Tavuk Şiş', sku: 'P-TAVUK-SIS', price: 200, category: 'Yiyecek', productTypeId: typeMap['Yiyecek'], linkedStockCode: 'SC-TAVUK-SIS' },
    { name: 'Adana Kebap', sku: 'P-ADANA', price: 280, category: 'Yiyecek', productTypeId: typeMap['Yiyecek'], linkedStockCode: 'SC-ADANA' },
    { name: 'Urfa Kebap', sku: 'P-URFA', price: 280, category: 'Yiyecek', productTypeId: typeMap['Yiyecek'], linkedStockCode: 'SC-URFA' },
    { name: 'Caesar Salata', sku: 'P-CAESAR', price: 150, category: 'Yiyecek', productTypeId: typeMap['Yiyecek'], linkedStockCode: 'SC-CAESAR' },
    { name: 'Mevsim Salata', sku: 'P-MEVSIM', price: 100, category: 'Yiyecek', productTypeId: typeMap['Yiyecek'], linkedStockCode: 'SC-MEVSIM' },
    { name: 'Sezar Wrap', sku: 'P-WRAP', price: 180, category: 'Yiyecek', productTypeId: typeMap['Yiyecek'], linkedStockCode: 'SC-WRAP' },
    { name: 'Hamburger', sku: 'P-HAMBURGER', price: 220, category: 'Yiyecek', productTypeId: typeMap['Yiyecek'], linkedStockCode: 'SC-HAMBURGER' },
    { name: 'Cheeseburger', sku: 'P-CHEESEBURGER', price: 250, category: 'Yiyecek', productTypeId: typeMap['Yiyecek'], linkedStockCode: 'SC-CHEESEBURGER' },
    { name: 'Patates Kızartması', sku: 'P-PATATES', price: 80, category: 'Yiyecek', productTypeId: typeMap['Yiyecek'], linkedStockCode: 'SC-PATATES' },
    { name: 'Soğan Halkası', sku: 'P-SOGAN', price: 90, category: 'Yiyecek', productTypeId: typeMap['Yiyecek'], linkedStockCode: 'SC-SOGAN' },
    { name: 'Künefe', sku: 'P-KUNEFE', price: 150, category: 'Tatlı', productTypeId: typeMap['Tatlı'], linkedStockCode: 'SC-KUNEFE' },
    { name: 'Sütlaç', sku: 'P-SUTLAC', price: 80, category: 'Tatlı', productTypeId: typeMap['Tatlı'], linkedStockCode: 'SC-SUTLAC' },
    { name: 'Profiterol', sku: 'P-PROFITEROL', price: 120, category: 'Tatlı', productTypeId: typeMap['Tatlı'], linkedStockCode: 'SC-PROFITEROL' },
    { name: 'Baklava', sku: 'P-BAKLAVA', price: 130, category: 'Tatlı', productTypeId: typeMap['Tatlı'], linkedStockCode: 'SC-BAKLAVA' },
    { name: 'Cheesecake', sku: 'P-CHEESECAKE', price: 140, category: 'Tatlı', productTypeId: typeMap['Tatlı'], linkedStockCode: 'SC-CHEESECAKE' },
    { name: 'Tiramisu', sku: 'P-TIRAMISU', price: 140, category: 'Tatlı', productTypeId: typeMap['Tatlı'], linkedStockCode: 'SC-TIRAMISU' },
    { name: 'Serpme Kahvaltı', sku: 'P-SERPME', price: 450, category: 'Kahvaltı', productTypeId: typeMap['Kahvaltı'], linkedStockCode: 'SC-SERPME' },
    { name: 'Omlet', sku: 'P-OMLET', price: 120, category: 'Kahvaltı', productTypeId: typeMap['Kahvaltı'], linkedStockCode: 'SC-OMLET' },
    { name: 'Menemen', sku: 'P-MENEMEN', price: 110, category: 'Kahvaltı', productTypeId: typeMap['Kahvaltı'], linkedStockCode: 'SC-MENEMEN' },
    { name: 'Sucuklu Yumurta', sku: 'P-SUCUKLU', price: 130, category: 'Kahvaltı', productTypeId: typeMap['Kahvaltı'], linkedStockCode: 'SC-SUCUKLU' },
    { name: 'Sahanda Yumurta', sku: 'P-SAHANDA', price: 100, category: 'Kahvaltı', productTypeId: typeMap['Kahvaltı'], linkedStockCode: 'SC-SAHANDA' },
    { name: 'Masa Servis Ücreti', sku: 'P-SERVIS', price: 50, category: 'Servis / Ücret', productTypeId: typeMap['Servis / Ücret'] },
    { name: 'Paket Servis Ücreti', sku: 'P-PAKET', price: 30, category: 'Servis / Ücret', productTypeId: typeMap['Servis / Ücret'] },
  ];

  let existingProducts = await fetch(`${API}/products`, { headers }).then(r => r.json());
  if (!Array.isArray(existingProducts)) existingProducts = [];
  
  let created = 0;

  for (const p of productsToCreate) {
    const exists = existingProducts.find(e => e.sku === p.sku);
    if (!exists) {
      const body = {
        name: p.name,
        sku: p.sku,
        price: p.price,
        category: p.category,
        productTypeId: p.productTypeId,
        isActive: true,
        posVisible: true,
        vatRate: 10,
      };

      if (p.linkedStockCode && scMap[p.linkedStockCode]) {
        body.inventoryLinkType = 'direct_stock';
        body.linkedStockItemId = scMap[p.linkedStockCode];
        body.directStockQty = 1;
        body.directStockUnit = 'adet';
      }

      const res = await fetch(`${API}/products`, {
        method: 'POST', headers,
        body: JSON.stringify(body)
      });
      if (res.ok) created++;
    }
  }

  console.log(`🎉 Toplam ${created} yeni ürün oluşturuldu!`);
}

main().catch(console.error);
