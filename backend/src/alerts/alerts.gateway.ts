import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AlertsService } from './alerts.service';

/**
 * Alerts Gateway — mevcut KitchenGateway ile aynı porta bağlanır.
 * socket.io namespace: /alerts
 */
@WebSocketGateway({
  namespace: 'alerts',
  cors: { origin: '*' },
})
export class AlertsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly alertsService: AlertsService) {
    // AlertsService'e WebSocket callback'i kaydet
    this.alertsService.setNotifyCallback((notification) => {
      this.pushNotification(notification);
    });
  }

  handleConnection(client: Socket) {
    console.log(`[AlertsGateway] connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[AlertsGateway] disconnected: ${client.id}`);
  }

  /**
   * İstemci giriş yaptığında kendi userId'sine göre odaya katılır.
   * Mesaj: { userId: number, roleId?: number }
   */
  @SubscribeMessage('alert:join')
  async handleJoin(
    @MessageBody() data: { userId: number; roleId?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userRoom = `user:${data.userId}`;
    client.join(userRoom);

    if (data.roleId) {
      const roleRoom = `role:${data.roleId}`;
      client.join(roleRoom);
    }

    // ALL odasına her kullanıcı katılır
    client.join('all');

    // Bağlantı sonrası okunmamış sayısını gönder
    const count = await this.alertsService.getUnreadCount(data.userId, data.roleId);
    client.emit('alert:unread_count', { count });
  }

  /** Yeni bildirim push'u */
  pushNotification(notification: any) {
    if (!notification) return;

    const { targetUserId, targetRoleId } = notification;

    if (targetUserId) {
      this.server.to(`user:${targetUserId}`).emit('alert:new', notification);
    } else if (targetRoleId) {
      this.server.to(`role:${targetRoleId}`).emit('alert:new', notification);
    } else {
      // ALL
      this.server.to('all').emit('alert:new', notification);
    }
  }
}
