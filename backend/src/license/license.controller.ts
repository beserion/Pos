import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { LicenseService } from './license.service';
import { Public } from '../auth/public.decorator';

@Controller('licenses')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Public()
  @Get('status')
  async getStatus() {
    return this.licenseService.getStatus();
  }

  @Public()
  @Post('activate')
  async activateLicense(@Body('key') key: string) {
    if (!key) {
      throw new HttpException('Lisans anahtarı gerekli.', HttpStatus.BAD_REQUEST);
    }
    
    const result = await this.licenseService.saveLicense(key);
    if (!result.success) {
      throw new HttpException(result.message, HttpStatus.BAD_REQUEST);
    }
    
    return result;
  }
}
