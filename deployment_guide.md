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

Uygulamayı dış dünyaya (80/443 portu) açmak için IIS üzerinde Ters Vekil (Reverse Proxy) kurmalısınız. İşlemi arayüzden yapamıyorsanız veya sihirbaz çıkmıyorsa, projenizin kök dizinine bir `web.config` dosyası oluşturarak tüm ayarları otomatik yapabilirsiniz.

### Yöntem 1: web.config ile Kurulum (En Kolayı)
Sitenizi oluşturduğunuz klasörün (Örn: `C:\inetpub\wwwroot\posapp`) içine `web.config` adında bir dosya oluşturun ve şu kodları yapıştırın:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="API Reverse Proxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:3001/api/{R:1}" />
                </rule>
                <rule name="Frontend Reverse Proxy" stopProcessing="true">
                    <match url="(.*)" />
                    <action type="Rewrite" url="http://localhost:3000/{R:1}" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
```
*(Not: Bu işlemin çalışması için IIS Manager -> Server Yöneticisine tıklayıp -> Application Request Routing Cache -> sağdaki menüden Server Proxy Settings -> Enable proxy işaretli olmalıdır.)*

### Yöntem 2: IIS Arayüzünden Manuel Kurulum
Eğer `web.config` kullanmak istemiyorsanız:
1. **Frontend Kuralı:** Sitenize tıklayın -> URL Rewrite -> Add Rule(s) -> Blank rule:
   - Name: `Frontend Proxy`
   - Match URL Pattern: `(.*)`
   - Action type: `Rewrite`, Rewrite URL: `http://localhost:3000/{R:1}`
2. **Backend/API Kuralı:** Tekrar Blank rule ekleyin:
   - Name: `API Proxy`
   - Match URL Pattern: `^api/(.*)`
   - Action type: `Rewrite`, Rewrite URL: `http://localhost:3001/api/{R:1}`
3. **Önemli:** API kuralı, listede Frontend kuralının **ÜSTÜNDE** olmalıdır (sağ menüden "Move Up" yapın).

## 5. Veritabanı

`backend/.env` dosyasındaki SQL Server bağlantı bilgilerinin sunucuya uygun olduğundan emin olun. Gerekirse `AntigravityPOS_Migration.sql` dosyasını kullanarak veritabanını güncelleyin.
