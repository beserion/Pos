import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemLicense } from './license.entity';
import { LicenseCryptoUtil, DecryptedLicense } from './crypto.util';
import * as os from 'os';
import axios from 'axios';

@Injectable()
export class LicenseService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LicenseService.name);

  constructor(
    @InjectRepository(SystemLicense)
    private readonly licenseRepo: Repository<SystemLicense>,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Lisans durumu kontrol ediliyor...');
    const status = await this.checkLicenseStatus();
    if (!status.isValid) {
      this.logger.warn('*** LİSANS GEÇERSİZ VEYA BULUNAMADI! LÜTFEN LİSANS GİRİNİZ ***');
    } else {
      this.logger.log(`Lisans Doğrulandı! MüşteriID: ${status.details?.cid} | Offline Kalma: ${status.daysOffline} gün`);
    }
  }

  // Cihaza özel tekil ID üretme
  private getDeviceId(): string {
    const interfaces = os.networkInterfaces();
    let mac = '';
    for (const key in interfaces) {
      const net = interfaces[key];
      if (!net) continue;
      for (const alias of net) {
        if (!alias.internal && alias.mac && alias.mac !== '00:00:00:00:00:00') {
          mac = alias.mac;
          break;
        }
      }
      if (mac) break;
    }
    return mac || os.hostname() || 'unknown-device';
  }

  async saveLicense(licenseKey: string): Promise<any> {
    const deviceId = this.getDeviceId();
    
    // Önce lokalde çözülebiliyor mu kontrol et
    const decrypted = LicenseCryptoUtil.decryptKey(licenseKey);
    if (!decrypted) {
      return { success: false, message: 'Geçersiz veya bozuk lisans anahtarı formatı.' };
    }

    // Panel üzerinden online aktivasyon / doğrulama yapmayı dene
    const panelUrl = process.env.PANEL_URL;
    const apiKey = process.env.LICENSE_API_KEY;
    
    if (panelUrl && apiKey) {
      try {
        const response = await axios.post(`${panelUrl}/api/licenses/validate`, {
          licenseKey: licenseKey,
          deviceId: deviceId,
          deviceName: os.hostname(),
        }, {
          headers: { 'x-api-key': apiKey }
        });

        if (!response.data.valid) {
          return { success: false, message: 'Lisans merkezi sunucu tarafından reddedildi.' };
        }
      } catch (err: any) {
        this.logger.error('Lisans sunucusuna erişilemedi: ' + err.message);
        // İlk aktivasyon anında online olmak zorunludur diyebiliriz veya offline kabul edebiliriz.
        // Güvenlik gereği ilk aktivasyonda panel ile bağlanmasını isteyebiliriz.
        return { success: false, message: 'İnternet bağlantısı yok veya sunucuya ulaşılamadı. Aktivasyon için internet gereklidir.' };
      }
    }

    // Başarılıysa veritabanına kaydet (Eski anahtarı temizleyelim, cihazda tek anahtar olur genelde)
    await this.licenseRepo.clear();
    
    const newLicense = this.licenseRepo.create({
      licenseKey,
      deviceId,
      isActivated: true,
      lastOnlineCheck: new Date(),
    });
    
    await this.licenseRepo.save(newLicense);
    
    return { success: true, message: 'Lisans başarıyla aktifleştirildi.' };
  }

  async checkLicenseStatus(): Promise<{ isValid: boolean; modules: string[]; daysOffline: number; details?: DecryptedLicense, reason?: string }> {
    const licenses = await this.licenseRepo.find();
    if (!licenses || licenses.length === 0) {
      return { isValid: false, modules: [], daysOffline: 0, reason: 'Lisans anahtarı bulunamadı' };
    }

    const currentLicense = licenses[0];
    const decrypted = LicenseCryptoUtil.decryptKey(currentLicense.licenseKey);

    if (!decrypted) {
      return { isValid: false, modules: [], daysOffline: 0, reason: 'Lisans anahtarı okunamıyor (Bozuk)' };
    }

    // Süre kontrolü (Local çözüme göre bitiş tarihi)
    const expiration = new Date(decrypted.exp);
    if (new Date() > expiration) {
      return { isValid: false, modules: [], daysOffline: 0, reason: 'Lisans süresi dolmuş' };
    }

    // Online Verify Denemesi
    const panelUrl = process.env.PANEL_URL;
    const apiKey = process.env.LICENSE_API_KEY;
    let onlineValid = false;
    let onlineModules: string[] = [];

    if (panelUrl && apiKey) {
      try {
        const payload = { licenseKey: currentLicense.licenseKey, deviceId: currentLicense.deviceId };
        const response = await axios.post(`${panelUrl}/api/licenses/verify`, payload, {
          headers: { 'x-api-key': apiKey },
          timeout: 5000
        });

        if (response.data.valid) {
          onlineValid = true;
          // ✅ Panel'den gelen GÜNCEL modülleri kullan
          onlineModules = response.data.modules || [];
          currentLicense.lastOnlineCheck = new Date();
          await this.licenseRepo.save(currentLicense);
        } else {
          // Sunucu iptal etmiş veya engellemiş
          return { isValid: false, modules: [], daysOffline: 0, reason: 'Lisans sunucu tarafından iptal edilmiş' };
        }
      } catch (err) {
        this.logger.warn('Panel sunucusuna ulaşılamadı. Offline moda geçiliyor...');
      }
    }

    // Offline Kontrol (8 gün sınırı)
    let daysOffline = 0;
    if (!onlineValid && currentLicense.lastOnlineCheck) {
      const diffTime = Math.abs(new Date().getTime() - currentLicense.lastOnlineCheck.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysOffline = diffDays;
      
      if (diffDays > 8) {
        return { isValid: false, modules: [], daysOffline: diffDays, reason: 'İnternet bağlantısı 8 günden uzun süredir yok. Cihaz kilitlendi.' };
      }
    }

    // Online ise Panel'den gelen modülleri, offline ise şifreli key'deki modülleri kullan
    const activeModules = onlineValid ? onlineModules : decrypted.modules;

    return {
      isValid: true,
      modules: activeModules,
      daysOffline,
      details: decrypted,
    };
  }

  async getLocalModules(): Promise<string[]> {
    const licenses = await this.licenseRepo.find();
    if (!licenses || licenses.length === 0) return [];
    const decrypted = LicenseCryptoUtil.decryptKey(licenses[0].licenseKey);
    return decrypted ? decrypted.modules : [];
  }

  async getStatus() {
    return this.checkLicenseStatus();
  }
}
