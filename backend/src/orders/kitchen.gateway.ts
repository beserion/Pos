import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*', // Allow connections from Next.js (port 3000)
    },
})
export class KitchenGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        console.log(`Kitchen/Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Kitchen/Client disconnected: ${client.id}`);
    }

    notifyNewOrder(order: any) {
        this.server.emit('newOrder', order);
    }

    notifyOrderReady(order: any) {
        this.server.emit('orderReady', order);
    }
}
