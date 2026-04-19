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
import { PushSubscriptionEntity } from '../users/push-subscription.entity';
import * as webpush from 'web-push';

export interface AlertPayload {
  triggerUserId?: number;
  triggerUserName?: string;
  saleId?: number;
  tableId?: number;
  tableName?: string;
  relatedId?: number;
  description: string;
  /** EÅŸik karÅŸÄ±laÅŸtÄ±rmasÄ± iÃ§in sayÄ±sal deÄŸer (indirim oranÄ±, PIN deneme sayÄ±sÄ± vb.) */
  numericValue?: number;
  /** Dinamik bildirim hedefi (Ã¶rn. sipariÅŸi veren garson iÃ§in) */
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

  // Bildirim WebSocket callback â€” Gateway tarafÄ±ndan set edilir
  private notifyCallback: ((notification: AlertNotification) => void) | null = null;

  constructor(
    @InjectRepository(AlertRule)
    private ruleRepository: Repository<AlertRule>,

    @InjectRepository(AlertNotification)
    private notificationRepository: Repository<AlertNotification>,

    @InjectRepository(PushSubscriptionEntity)
    private pushSubRepository: Repository<PushSubscriptionEntity>,
  ) {
    webpush.setVapidDetails(
      'mailto:test@posnetx.com',
      process.env.VAPID_PUBLIC_KEY || 'BKCZ7bFimVEV8fWGuC2tRdmMO78CUqJ81bZbyjf08j57x4rdXogQ1x3oH2ROrPRdXKjLoOkGH6mPglk6KQFT4cI',
      process.env.VAPID_PRIVATE_KEY || 'l-DQdBwG1CRIeNrJiJB9VBAFQ7KSjtj9NU5f9S7-g8M'
    );
  }

  async onModuleInit() {
    await this.ensureSchema();
  }

  /** Tablolar yoksa oluÅŸtur (synchronize: false olduÄŸu iÃ§in manuel) */
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

  // â”€â”€â”€ KURAL YÃ–NETÄ°MÄ° â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    if (!rule) throw new Error(`AlertRule ${id} bulunamadÄ±`);
    rule.isActive = !rule.isActive;
    return this.ruleRepository.save(rule);
  }

  async deleteRule(id: number): Promise<void> {
    await this.ruleRepository.delete(id);
  }

  // â”€â”€â”€ BÄ°LDÄ°RÄ°M YÃ–NETÄ°MÄ° â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€â”€ ANA TETÄ°KLEYÄ°CÄ° â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Bir olay gerÃ§ekleÅŸtiÄŸinde Ã§aÄŸrÄ±lÄ±r.
   * Ä°lgili aktif kurallarÄ± kontrol eder ve gerekirse bildirim Ã¼retir.
   */
  async trigger(eventKey: string, payload: AlertPayload): Promise<void> {
    try {
      const rules = await this.ruleRepository.find({
        where: { eventKey, isActive: true },
      });

      if (!rules || rules.length === 0) return;

      for (const rule of rules) {
        // EÅŸik kontrolÃ¼
        if (rule.thresholdValue !== null && rule.thresholdValue !== undefined) {
          const val = payload.numericValue ?? 0;
          const threshold = Number(rule.thresholdValue);
          
          if (rule.eventKey === 'STOCK_LOW') {
            if (val > threshold) continue; // Stok eÅŸiÄŸin Ã¼stÃ¼ndeyse atla
          } else {
            if (val < threshold) continue; // DiÄŸer kurallarda eÅŸiÄŸin altÄ±ndaysa atla
          }
        }

        // Hedef kullanÄ±cÄ±(lar)Ä± belirle
        let targets = await this.resolveTargets(rule);

        // Ã–zel durum: KDS_MESSAGE_ACTIVE dinamik hedef geÃ§ersizliÄŸi
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

          // Web Push Gönderimi (Native Bildirim için)
          if (target.userId) {
            this.sendWebPush(target.userId, {
              title: 'PosNetX Bildirim',
              body: payload.description,
              url: '/#',
            });
          } else if (target.roleId) {
             const manager = this.ruleRepository.manager;
             const users: { id: number }[] = await manager.query(
               `SELECT id FROM users WHERE roleId = @0 AND isActive = 1`,
               [target.roleId],
             );
             users.forEach(u => this.sendWebPush(u.id, {
               title: 'PosNetX Bildirim',
               body: payload.description,
               url: '/#',
             }));
          }
        }
      }
    } catch (error) {
      this.logger.error(`AlertsService.trigger(${eventKey}) error:`, error);
    }
  }

  /** İlgili kullanıcıya VAPID üzerinden (arka plan) bildirim gönderir */
  private async sendWebPush(userId: number, payload: any) {
    try {
      const subs = await this.pushSubRepository.find({ where: { userId } });
      this.logger.log(`Found ${subs.length} push subscriptions for user ${userId}`);
      
      for (const sub of subs) {
        try {
          this.logger.log(`Sending push to endpoint: ${sub.endpoint.substring(0, 40)}...`);
          const result = await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            JSON.stringify(payload)
          );
          this.logger.log(`Push sent successfully. Status: ${result.statusCode}`);
        } catch (pushErr: any) {
          this.logger.error(`Push Service error (User: ${userId}, Status: ${pushErr.statusCode}):`, pushErr.message);
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            this.logger.warn(`Subscription expired or invalid. Deleting.`);
            await this.pushSubRepository.delete(sub.id);
          }
        }
      }
    } catch (err) {
      this.logger.error('Push load error', err);
    }
  }

  /** Kural hedefine göre bildirim alacak kullanıcı/rol listesini çöz */
  private async resolveTargets(rule: AlertRule): Promise<{ userId?: number; roleId?: number }[]> {
    const manager = this.ruleRepository.manager;

    if (rule.targetType === 'USER' && rule.targetId) {
      return [{ userId: rule.targetId }];
    }

    if (rule.targetType === 'ROLE' && rule.targetId) {
      // O roldeki tÃ¼m aktif kullanÄ±cÄ±lara kayÄ±t yaz
      const users: { id: number }[] = await manager.query(
        `SELECT id FROM users WHERE roleId = @0 AND isActive = 1`,
        [rule.targetId],
      );
      return users.map((u) => ({ userId: u.id, roleId: rule.targetId }));
    }

    // ALL â†’ targetUserId / targetRoleId null bÄ±rak (herkes iÃ§in)
    return [{ userId: undefined, roleId: undefined }];
  }

  /** 30 gÃ¼nden eski bildirimleri her gece temizle */
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
      this.logger.error('Eski bildirim temizliÄŸi hatasÄ±:', error);
    }
  }
}

