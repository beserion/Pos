// Seed: 10 customer + 10 supplier into partners table
const sql = require('mssql');
const config = {
    user: 'sa', password: 'Oryx123!', server: '149.34.201.35', port: 1433,
    database: 'AntigravityPOS', options: { encrypt: false, trustServerCertificate: true }
};

const customers = [
    { name: 'Mehmet Yılmaz', contactName: 'Mehmet Yılmaz', email: 'mehmet@example.com', phone: '0532 111 2233', city: 'İstanbul', taxNumber: '12345678901', taxOffice: 'Kadıköy' },
    { name: 'Ayşe Demir', contactName: 'Ayşe Demir', email: 'ayse@example.com', phone: '0533 222 3344', city: 'Ankara', taxNumber: '23456789012', taxOffice: 'Çankaya' },
    { name: 'Ali Kaya', contactName: 'Ali Kaya', email: 'ali@example.com', phone: '0534 333 4455', city: 'İzmir', taxNumber: '34567890123', taxOffice: 'Konak' },
    { name: 'Fatma Çelik', contactName: 'Fatma Çelik', email: 'fatma@example.com', phone: '0535 444 5566', city: 'Bursa', taxNumber: '45678901234', taxOffice: 'Nilüfer' },
    { name: 'Hasan Öztürk', contactName: 'Hasan Öztürk', email: 'hasan@example.com', phone: '0536 555 6677', city: 'Antalya', taxNumber: '56789012345', taxOffice: 'Muratpaşa' },
    { name: 'Zeynep Arslan', contactName: 'Zeynep Arslan', email: 'zeynep@example.com', phone: '0537 666 7788', city: 'Adana', taxNumber: '67890123456', taxOffice: 'Seyhan' },
    { name: 'Murat Şahin', contactName: 'Murat Şahin', email: 'murat@example.com', phone: '0538 777 8899', city: 'Konya', taxNumber: '78901234567', taxOffice: 'Selçuklu' },
    { name: 'Elif Doğan', contactName: 'Elif Doğan', email: 'elif@example.com', phone: '0539 888 9900', city: 'Gaziantep', taxNumber: '89012345678', taxOffice: 'Şahinbey' },
    { name: 'Can Yıldız', contactName: 'Can Yıldız', email: 'can@example.com', phone: '0541 999 0011', city: 'Mersin', taxNumber: '90123456789', taxOffice: 'Yenişehir' },
    { name: 'Selin Aydın', contactName: 'Selin Aydın', email: 'selin@example.com', phone: '0542 100 1122', city: 'Kayseri', taxNumber: '01234567890', taxOffice: 'Melikgazi' },
];

const suppliers = [
    { name: 'Güneş Gıda Ltd. Şti.', contactName: 'Kemal Güneş', email: 'kemal@gunesgida.com', phone: '0212 555 0101', city: 'İstanbul', taxNumber: '11111111111', taxOffice: 'Bağcılar', address: 'Bağcılar OSB No:5' },
    { name: 'Anadolu Et Ürünleri A.Ş.', contactName: 'Serdar Anadolu', email: 'info@anadoluet.com', phone: '0312 555 0202', city: 'Ankara', taxNumber: '22222222222', taxOffice: 'Sincan', address: 'Sincan OSB No:12' },
    { name: 'Ege Tarım Ürünleri', contactName: 'Burak Ege', email: 'burak@egetarim.com', phone: '0232 555 0303', city: 'İzmir', taxNumber: '33333333333', taxOffice: 'Torbalı', address: 'Torbalı Mah. No:3' },
    { name: 'Karadeniz Fındık San.', contactName: 'Orhan Karadeniz', email: 'orhan@kdz.com', phone: '0462 555 0404', city: 'Trabzon', taxNumber: '44444444444', taxOffice: 'Ortahisar', address: 'Ortahisar Cd. No:8' },
    { name: 'Akdeniz İçecek A.Ş.', contactName: 'Berna Akdeniz', email: 'berna@akdizicecek.com', phone: '0242 555 0505', city: 'Antalya', taxNumber: '55555555555', taxOffice: 'Kepez', address: 'Kepez Sanayi No:21' },
    { name: 'Marmara Ambalaj Ltd.', contactName: 'Turgut Marmara', email: 'turgut@marmaraab.com', phone: '0262 555 0606', city: 'Kocaeli', taxNumber: '66666666666', taxOffice: 'Gebze', address: 'Gebze OSB No:7' },
    { name: 'Boğaziçi Kuru Gıda', contactName: 'Hülya Boğaziçi', email: 'hulya@bogaz.com', phone: '0216 555 0707', city: 'İstanbul', taxNumber: '77777777777', taxOffice: 'Ümraniye', address: 'Ümraniye Sanayi Sit.' },
    { name: 'Toros Baharat Evi', contactName: 'İsmail Toros', email: 'ismail@torosbaharat.com', phone: '0322 555 0808', city: 'Adana', taxNumber: '88888888888', taxOffice: 'Çukurova', address: 'Çukurova Sanayi No:14' },
    { name: 'Yıldız Soğuk Hava Ltd.', contactName: 'Pınar Yıldız', email: 'pinar@yildizso.com', phone: '0224 555 0909', city: 'Bursa', taxNumber: '99999999999', taxOffice: 'Osmangazi', address: 'Osmangazi OSB No:2' },
    { name: 'Çamlıbel Süt Ürünleri', contactName: 'Erdal Çam', email: 'erdal@camlibel.com', phone: '0352 555 1010', city: 'Kayseri', taxNumber: '10101010101', taxOffice: 'Kocasinan', address: 'Kocasinan OSB No:9' },
];

async function seed() {
    await sql.connect(config);
    let added = 0;

    for (const c of customers) {
        await sql.query`
            INSERT INTO partners (name, type, contactName, email, phone, city, taxNumber, taxOffice, creditLimit, currentBalance, isActive, createdAt, updatedAt)
            VALUES (${c.name}, 'CUSTOMER', ${c.contactName}, ${c.email}, ${c.phone}, ${c.city}, ${c.taxNumber}, ${c.taxOffice}, 0, 0, 1, GETDATE(), GETDATE())
        `;
        added++;
    }

    for (const s of suppliers) {
        await sql.query`
            INSERT INTO partners (name, type, contactName, email, phone, city, taxNumber, taxOffice, address, creditLimit, currentBalance, isActive, createdAt, updatedAt)
            VALUES (${s.name}, 'SUPPLIER', ${s.contactName}, ${s.email}, ${s.phone}, ${s.city}, ${s.taxNumber}, ${s.taxOffice}, ${s.address}, 0, 0, 1, GETDATE(), GETDATE())
        `;
        added++;
    }

    console.log(`✅ ${added} partner eklendi (10 müşteri + 10 tedarikçi)`);
    sql.close();
}

seed().catch(e => { console.error('Seed hatası:', e.message); sql.close(); });
