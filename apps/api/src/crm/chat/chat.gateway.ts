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

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
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
        client.data.role = 'agent';
      } catch {
        client.data.role = 'visitor';
      }
    } else {
      client.data.role = 'visitor';
    }
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('chat:join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    client.join(`chat:${data.sessionId}`);
    return { event: 'chat:joined', data: { sessionId: data.sessionId } };
  }

  @SubscribeMessage('chat:message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; senderType: string; senderId?: string; content: string },
  ) {
    this.server.to(`chat:${data.sessionId}`).emit('chat:message', {
      sessionId: data.sessionId,
      senderType: data.senderType,
      senderId: data.senderId ?? client.data.userId,
      content: data.content,
      createdAt: new Date().toISOString(),
    });
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; senderType: string },
  ) {
    client.to(`chat:${data.sessionId}`).emit('chat:typing', {
      sessionId: data.sessionId,
      senderType: data.senderType,
      senderId: client.data.userId,
    });
  }

  emitSessionEnded(sessionId: string) {
    this.server.to(`chat:${sessionId}`).emit('chat:ended', { sessionId });
  }
}
