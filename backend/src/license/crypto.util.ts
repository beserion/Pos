import * as crypto from 'crypto';

export interface DecryptedLicense {
  cid: number;
  modules: string[];
  exp: string;
  iat: string;
  maxDevices: number;
  nonce: string;
}

export class LicenseCryptoUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 16;

  static decryptKey(licenseKey: string): DecryptedLicense | null {
    try {
      const encKeyHex = process.env.LICENSE_ENCRYPTION_KEY;
      const hmacKeyHex = process.env.LICENSE_HMAC_KEY;
      if (!encKeyHex || !hmacKeyHex) {
        throw new Error('LICENSE_ENCRYPTION_KEY veya LICENSE_HMAC_KEY eksik.');
      }

      const encryptionKey = crypto.createHash('sha256').update(encKeyHex).digest();
      const hmacKey = hmacKeyHex;

      if (!licenseKey.startsWith('PNTX-')) return null;

      const withoutPrefix = licenseKey.substring(5);
      const [base64Data, signature] = withoutPrefix.split('.');

      if (!base64Data || !signature) return null;

      // 1) HMAC Doğrulaması
      const expectedSig = crypto
        .createHmac('sha256', hmacKey)
        .update(base64Data)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        console.error('MAC mismatch! Anahtar kurcalanmış veya bozuk.');
        return null;
      }

      // 2) AES-256-GCM Çözme
      const combined = Buffer.from(base64Data, 'base64url');
      const iv = combined.subarray(0, this.IV_LENGTH);
      const authTag = combined.subarray(this.IV_LENGTH, this.IV_LENGTH + this.AUTH_TAG_LENGTH);
      const cipherText = combined.subarray(this.IV_LENGTH + this.AUTH_TAG_LENGTH);

      const decipher = crypto.createDecipheriv(this.ALGORITHM, encryptionKey, iv, {
        authTagLength: this.AUTH_TAG_LENGTH,
      });
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(cipherText),
        decipher.final(),
      ]);

      return JSON.parse(decrypted.toString('utf8')) as DecryptedLicense;
    } catch (error) {
      console.error('Şifre çözme hatası:', error);
      return null;
    }
  }
}
