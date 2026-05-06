import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AlertsService } from './alerts.service';
import { Permissions } from '../auth/permissions.decorator';
import type { CreateRuleDto, UpdateRuleDto } from './alerts.service';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  // ─── KURAL YÖNETİMİ ─────────────────────────────────────────

  /** Tüm kuralları getir */
  @Get('rules')
  @Permissions('ALERTS:VIEW')
  findAllRules() {
    return this.alertsService.findAllRules();
  }

  /** Yeni kural oluştur */
  @Post('rules')
  @Permissions('ALERTS:ADD')
  createRule(@Body() dto: CreateRuleDto) {
    return this.alertsService.createRule(dto);
  }

  /** Kural güncelle */
  @Put('rules/:id')
  @Permissions('ALERTS:EDIT')
  updateRule(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRuleDto) {
    return this.alertsService.updateRule(id, dto);
  }

  /** Kural aktif/pasif toggle */
  @Patch('rules/:id/toggle')
  @Permissions('ALERTS:EDIT')
  toggleRule(@Param('id', ParseIntPipe) id: number) {
    return this.alertsService.toggleRule(id);
  }

  /** Kural sil */
  @Delete('rules/:id')
  @Permissions('ALERTS:DELETE')
  deleteRule(@Param('id', ParseIntPipe) id: number) {
    return this.alertsService.deleteRule(id);
  }

  // ─── BİLDİRİM YÖNETİMİ ─────────────────────────────────────

  /** Kullanıcının bildirimlerini getir */
  @Get('notifications')
  getNotifications(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('roleId') roleId?: string,
  ) {
    const currentUserId = req.user.userId || req.user.id;
    const targetUserId = userId ? parseInt(userId, 10) : currentUserId;
    const targetRoleId = roleId ? parseInt(roleId, 10) : undefined;

    // Eğer kendisinden başka birini veya bir rolü izlemek istiyorsa yetki kontrolü
    if (targetUserId !== currentUserId || targetRoleId !== undefined) {
      // "ALERTS:VIEW" yetkisi yoksa sadece kendisini izleyebilir
      const hasViewAll = req.user.role?.permissions?.includes('ALERTS:VIEW') || 
                         req.user.extraPermissions?.includes('ALERTS:VIEW') ||
                         req.user.role?.name?.toUpperCase() === 'ADMIN';

      if (!hasViewAll) {
         // Force back to current user's own data
         return this.alertsService.getNotifications(currentUserId);
      }
    }

    return this.alertsService.getNotifications(targetUserId, targetRoleId);
  }

  /** Okunmamış bildirim sayısı */
  @Get('notifications/unread-count')
  getUnreadCount(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('roleId') roleId?: string,
  ) {
    const currentUserId = req.user.userId || req.user.id;
    const targetUserId = userId ? parseInt(userId, 10) : currentUserId;
    const targetRoleId = roleId ? parseInt(roleId, 10) : undefined;

    if (targetUserId !== currentUserId || targetRoleId !== undefined) {
      const hasViewAll = req.user.role?.permissions?.includes('ALERTS:VIEW') || 
                         req.user.role?.name?.toUpperCase() === 'ADMIN';

      if (!hasViewAll) {
         return this.alertsService.getUnreadCount(currentUserId).then((count) => ({ count }));
      }
    }

    return this.alertsService.getUnreadCount(targetUserId, targetRoleId).then((count) => ({ count }));
  }

  /** Tek bildirimi okundu işaretle */
  @Patch('notifications/:id/read')
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any
  ) {
    const currentUserId = req.user.userId || req.user.id;
    return this.alertsService.markAsRead(id, currentUserId);
  }

  /** Tüm bildirimleri okundu işaretle */
  @Post('notifications/mark-all-read')
  markAllAsRead(
    @Req() req: any,
    @Body('roleId') roleId?: number,
  ) {
    const currentUserId = req.user.userId || req.user.id;
    const targetRoleId = roleId ? roleId : undefined;

    return this.alertsService.markAllAsRead(currentUserId, targetRoleId);
  }
}
