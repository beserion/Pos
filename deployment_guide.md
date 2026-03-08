# POSAPP Windows Server Deployment Guide

Bu döküman, POSAPP (NestJS Backend & Next.js Frontend) uygulamasının Windows Server üzerinde IIS ve PM2 kullanılarak nasıl canlıya alınacağını (deploy) açıklar.

## 1. Gereksinimler

Sunucunuzda aşağıdaki yazılımların kurulu olduğundan emin olun:

- **Node.js (LTS sürümü)**: [nodejs.org](https://nodejs.org/)
- **SQL Server**: Veritabanı için.
- **IIS (Internet Information Services)**:
    - **URL Rewrite Module**: [İndir](https://www.iis.net/downloads/microsoft/url-rewrite)
    - **Application Request Routing (ARR) 3.0**: [İndir](https://www.iis.net/downloads/microsoft/application-request-routing)
- **PM2**: Node.js süreç yönetimi için.
    ```powershell
    npm install -g pm2
    npm install -g pm2-windows-startup
    pm2-startup install
    ```

## 2. Uygulamayı Derleme (Build)

Uygulamanın `publish` klasörünü oluşturmak için ana dizindeki PowerShell betiğini çalıştırın:

```powershell
.\publish_project.ps1
```

Bu işlem sonucunda ana dizinde bir `publish` klasörü oluşacaktır. Bu klasörü sunucuya kopyalayın.

## 3. Servislerin Başlatılması

Sunucuya kopyaladığınız `publish` klasörü içinde backend ve frontend servislerini PM2 ile başlatın:

### Backend (NestJS)
```powershell
cd publish\backend
npm install --omit=dev
pm2 start dist/main.js --name pos-backend
```

### Frontend (Next.js)
```powershell
cd publish\frontend
# Bağımlılıklar standalone modunda zaten dahildir.
pm2 start server.js --name pos-frontend
```

PM2 ayarlarını kaydetmek için:
```powershell
pm2 save
```

## 4. IIS Yapılandırması (Reverse Proxy)

Uygulamayı dış dünyaya (80/443 portu) açmak için IIS üzerinde Ters Vekil (Reverse Proxy) kurmalısınız:

1. **ARR Etkinleştirme**: IIS Manager -> Server Name -> Application Request Routing Cache -> Server Proxy Settings -> **Enable proxy** seçeneğini işaretleyin.
2. **Site Oluşturma**: IIS üzerinde yeni bir site oluşturun (örn: `posapp.local`).
3. **URL Rewrite**: Sitenin içine girin -> URL Rewrite -> Add Rule(s) -> Reverse Proxy:
    - API istekleri için (`/api`): `localhost:3001` (Backend portu)
    - Diğer istekler için: `localhost:3000` (Frontend portu)

## 5. Veritabanı

`backend/.env` dosyasındaki SQL Server bağlantı bilgilerinin sunucuya uygun olduğundan emin olun. Gerekirse `AntigravityPOS_Migration.sql` dosyasını kullanarak veritabanını güncelleyin.
