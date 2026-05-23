import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({ namespace: '/conversations', cors: { origin: '*' } })
export class ConversationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        const payload = this.jwt.verify(token, {
          secret: this.config.get<string>('JWT_SECRET'),
        });
        client.data.userId = payload.sub;
        client.data.workspaceId = payload.workspaceId;
      } catch {
        client.disconnect();
      }
    } else {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('conversation:join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conv:${data.conversationId}`);
    return { event: 'conversation:joined', data: { conversationId: data.conversationId } };
  }

  emitNewConversation(workspaceId: string, conversation: any) {
    this.server.to(`ws:${workspaceId}`).emit('conversation:new', conversation);
  }

  emitNewMessage(conversationId: string, message: any) {
    this.server.to(`conv:${conversationId}`).emit('conversation:message', message);
  }

  emitAssigned(conversationId: string, assigneeId: string) {
    this.server.to(`conv:${conversationId}`).emit('conversation:assigned', { conversationId, assigneeId });
  }
}
