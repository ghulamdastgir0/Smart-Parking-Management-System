import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';

function userRoom(userId: string): string {
  return `user:${userId}`;
}

// Pushes state-change events (check-in, check-out, ...) to a user's own devices the
// instant they happen, so a customer's dashboard/reservation page updates without waiting
// for its next poll — the scan itself typically happens on a different device (staff's
// checkpoint scanner), so client-side cache invalidation alone can't reach it.
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket): void {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      void client.join(userRoom(payload.sub));
    } catch {
      this.logger.warn('Rejected socket connection with invalid token');
      client.disconnect();
    }
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }
}
