import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertRule } from './alert-rule.entity';
import { AlertNotification } from './alert-notification.entity';

export interface AlertPayload {
  triggerUserId?: number;
  triggerUserName?: string;
  saleId?: number;
  tableId?: number;
  tableName?: string;
  relatedId?: number;
  description: string;
  /** Eşik karşılaştırması için sayısal değer (indirim oranı, PIN deneme sayısı vb.) */
  numericValue?: number;
  /** Dinamik bildirim hedefi (örn. siparişi veren garson için) */
  dynamicTargetUserId?: number;
}

export interface CreateRuleDto {
  eventKey: string;
  isActive?: boolean;
  severity: string;
  displayMode: string;
  thresholdValue?: number;
  targetType: string;
  targetId?: number;
  description?: string;
}

export interface UpdateRuleDto extends Partial<CreateRuleDto> {}

@Injectable()
export class AlertsService implements OnModuleInit {
  private readonly logger = new Logger(AlertsService.name);

  // Bildirim WebSocket callback — Gateway tarafından set edilir
  private notifyCallback: ((notification: AlertNotification) => void) | null = null;

  constructor(
    @InjectRepository(AlertRule)
    private ruleRepository: Repository<AlertRule>,

    @InjectRepository(AlertNotification)
    private notificationRepository: Repository<AlertNotification>,
  ) {}

  async onModuleInit() {
    await this.ensureSchema();
  }

  /** Tablolar yoksa oluştur (synchronize: false olduğu için manuel) */
  private async ensureSchema() {
    try {
      const queryRunner = this.ruleRepository.manager.connection.createQueryRunner();

      // alert_rules tablosu
      const rulesTable = await queryRunner.getTable('alert_rules');
      if (!rulesTable) {
        this.logger.log('Creating alert_rules table...');
        await queryRunner.query(`
          CREATE TABLE alert_rules (
            id INT IDENTITY(1,1) PRIMARY KEY,
            eventKey NVARCHAR(100) NOT NULL,
            isActive BIT NOT NULL DEFAULT 1,
            severity NVARCHAR(20) NOT NULL DEFAULT 'INFO',
            displayMode NVARCHAR(20) NOT NULL DEFAULT 'LIST',
            thresholdValue DECIMAL(10,2) NULL,
            targetType NVARCHAR(20) NOT NULL DEFAULT 'ALL',
            targetId INT NULL,
            description NVARCHAR(500) NULL,
            createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
            updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
          )
        `);
        this.logger.log('alert_rules table created.');
      }

      // alert_notifications tablosu
      const notifTable = await queryRunner.getTable('alert_notifications');
      if (!notifTable) {
        this.logger.log('Creating alert_notifications table...');
        await queryRunner.query(`
          CREATE TABLE alert_notifications (
            id INT IDENTITY(1,1) PRIMARY KEY,
            ruleId INT NULL,
            eventKey NVARCHAR(100) NOT NULL,
            severity NVARCHAR(20) NOT NULL DEFAULT 'INFO',
            displayMode NVARCHAR(20) NOT NULL DEFAULT 'LIST',
            targetUserId INT NULL,
            targetRoleId INT NULL,
            triggerUserId INT NULL,
            triggerUserName NVARCHAR(150) NULL,
            saleId INT NULL,
            tableId INT NULL,
            tableName NVARCHAR(50) NULL,
            relatedId INT NULL,
            description NVARCHAR(MAX) NULL,
            isRead BIT NOT NULL DEFAULT 0,
            readAt DATETIME2 NULL,
            readByUserId INT NULL,
            createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
            CONSTRAINT FK_alert_notifications_rule FOREIGN KEY (ruleId) REFERENCES alert_rules(id) ON DELETE SET NULL
          )
        `);
        this.logger.log('alert_notifications table created.');
      }

      await queryRunner.release();
    } catch (error) {
      this.logger.error('Error ensuring alert schema:', error);
    }
  }

  /** Gateway callback kaydet */
  setNotifyCallback(cb: (notification: AlertNotification) => void) {
    this.notifyCallback = cb;
  }

  // ─── KURAL YÖNETİMİ ───────────────────────────────────────────

  async findAllRules(): Promise<AlertRule[]> {
    return this.ruleRepository.find({ order: { createdAt: 'DESC' } });
  }

  async createRule(dto: CreateRuleDto): Promise<AlertRule> {
    const rule = this.ruleRepository.create(dto);
    return this.ruleRepository.save(rule);
  }

  async updateRule(id: number, dto: UpdateRuleDto): Promise<AlertRule | null> {
    await this.ruleRepository.update(id, dto);
    return this.ruleRepository.findOne({ where: { id } });
  }

  async toggleRule(id: number): Promise<AlertRule> {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) throw new Error(`AlertRule ${id} bulunamadı`);
    rule.isActive = !rule.isActive;
    return this.ruleRepository.save(rule);
  }

  async deleteRule(id: number): Promise<void> {
    await this.ruleRepository.delete(id);
  }

  // ─── BİLDİRİM YÖNETİMİ ──────────────────────────────────────

  async getNotifications(userId: number, roleId?: number): Promise<AlertNotification[]> {
    const query = this.notificationRepository.createQueryBuilder('n')
      .where('(n.targetUserId = :userId OR n.targetUserId IS NULL)', { userId })
      .orderBy('n.createdAt', 'DESC')
      .take(50);

    if (roleId) {
      query.andWhere('(n.targetRoleId = :roleId OR n.targetRoleId IS NULL)', { roleId });
    }

    return query.getMany();
  }

  async getUnreadCount(userId: number, roleId?: number): Promise<number> {
    const query = this.notificationRepository.createQueryBuilder('n')
      .where('n.isRead = 0')
      .andWhere('(n.targetUserId = :userId OR n.targetUserId IS NULL)', { userId });

    if (roleId) {
      query.andWhere('(n.targetRoleId = :roleId OR n.targetRoleId IS NULL)', { roleId });
    }

    return query.getCount();
  }

  async markAsRead(id: number, userId: number): Promise<void> {
    await this.notificationRepository.update(id, {
      isRead: true,
      readAt: new Date(),
      readByUserId: userId,
    });
  }

  async markAllAsRead(userId: number, roleId?: number): Promise<void> {
    const query = this.notificationRepository.createQueryBuilder()
      .update(AlertNotification)
      .set({ isRead: true, readAt: new Date(), readByUserId: userId })
      .where('isRead = 0')
      .andWhere('(targetUserId = :userId OR targetUserId IS NULL)', { userId });

    if (roleId) {
      query.andWhere('(targetRoleId = :roleId OR targetRoleId IS NULL)', { roleId });
    }

    await query.execute();
  }

  // ─── ANA TETİKLEYİCİ ────────────────────────────────────────

  /**
   * Bir olay gerçekleştiğinde çağrılır.
   * İlgili aktif kuralları kontrol eder ve gerekirse bildirim üretir.
   */
  async trigger(eventKey: string, payload: AlertPayload): Promise<void> {
    try {
      const rules = await this.ruleRepository.find({
        where: { eventKey, isActive: true },
      });

      if (!rules || rules.length === 0) return;

      for (const rule of rules) {
        // Eşik kontrolü
        if (rule.thresholdValue !== null && rule.thresholdValue !== undefined) {
          const val = payload.numericValue ?? 0;
          const threshold = Number(rule.thresholdValue);
          
          if (rule.eventKey === 'STOCK_LOW') {
            if (val > threshold) continue; // Stok eşiğin üstündeyse atla
          } else {
            if (val < threshold) continue; // Diğer kurallarda eşiğin altındaysa atla
          }
        }

        // Hedef kullanıcı(lar)ı belirle
        let targets = await this.resolveTargets(rule);

        // Özel durum: KDS_MESSAGE_ACTIVE dinamik hedef geçersizliği
        if (rule.eventKey === 'KDS_MESSAGE_ACTIVE' && payload.dynamicTargetUserId) {
          targets = [{ userId: payload.dynamicTargetUserId }];
        }

        for (const target of targets) {
          const notification = this.notificationRepository.create({
            ruleId: rule.id,
            eventKey: rule.eventKey,
            severity: rule.severity,
            displayMode: rule.displayMode,
            targetUserId: target.userId,
            targetRoleId: target.roleId,
            triggerUserId: payload.triggerUserId,
            triggerUserName: payload.triggerUserName,
            saleId: payload.saleId,
            tableId: payload.tableId,
            tableName: payload.tableName,
            relatedId: payload.relatedId,
            description: payload.description,
            isRead: false,
          });

          const saved = await this.notificationRepository.save(notification);

          // WebSocket ile anlık bildir
          if (this.notifyCallback) {
            this.notifyCallback(saved);
          }
        }
      }
    } catch (error) {
      this.logger.error(`AlertsService.trigger(${eventKey}) error:`, error);
    }
  }

  /** Kural hedefine göre bildirim alacak kullanıcı/rol listesini çöz */
  private async resolveTargets(rule: AlertRule): Promise<{ userId?: number; roleId?: number }[]> {
    const manager = this.ruleRepository.manager;

    if (rule.targetType === 'USER' && rule.targetId) {
      return [{ userId: rule.targetId }];
    }

    if (rule.targetType === 'ROLE' && rule.targetId) {
      // O roldeki tüm aktif kullanıcılara kayıt yaz
      const users: { id: number }[] = await manager.query(
        `SELECT id FROM users WHERE roleId = @0 AND isActive = 1`,
        [rule.targetId],
      );
      return users.map((u) => ({ userId: u.id, roleId: rule.targetId }));
    }

    // ALL → targetUserId / targetRoleId null bırak (herkes için)
    return [{ userId: undefined, roleId: undefined }];
  }

  /** 30 günden eski bildirimleri her gece temizle */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanOldNotifications() {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const result = await this.notificationRepository.delete({
        createdAt: LessThan(cutoff),
        isRead: true,
      });
      this.logger.log(`Temizlendi: ${result.affected || 0} eski bildirim silindi.`);
    } catch (error) {
      this.logger.error('Eski bildirim temizliği hatası:', error);
    }
  }
}
