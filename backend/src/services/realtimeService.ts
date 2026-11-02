import { Response } from 'express';

export interface RealtimeEvent {
  type: 'TRANSACTION_CREATED' | 'TRANSACTION_UPDATED' | 'TRANSACTION_DELETED' | 'ACCOUNT_UPDATED' | 'SEED_COMPLETED';
  action: string;
  data?: any;
  timestamp: string;
}

class RealtimeService {
  private userClients: Map<string, Set<Response>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Keep-alive heartbeat every 20 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 20000);
  }

  public addClient(userId: string, res: Response) {
    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, new Set());
    }

    const clients = this.userClients.get(userId)!;
    clients.add(res);

    // Initial SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if present
    res.flushHeaders();

    // Send connection handshake
    const welcome = `data: ${JSON.stringify({ type: 'CONNECTED', message: 'Aura Real-Time Stream Active', timestamp: new Date().toISOString() })}\n\n`;
    res.write(welcome);

    // Clean up on disconnect
    res.on('close', () => {
      this.removeClient(userId, res);
    });
  }

  public removeClient(userId: string, res: Response) {
    const clients = this.userClients.get(userId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        this.userClients.delete(userId);
      }
    }
  }

  public broadcastToUser(userId: string, event: RealtimeEvent) {
    const clients = this.userClients.get(userId);
    if (!clients || clients.size === 0) return;

    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of clients) {
      try {
        client.write(payload);
      } catch (err) {
        this.removeClient(userId, client);
      }
    }
  }

  private sendHeartbeat() {
    for (const [userId, clients] of this.userClients.entries()) {
      for (const client of clients) {
        try {
          client.write(`:keep-alive ${Date.now()}\n\n`);
        } catch {
          this.removeClient(userId, client);
        }
      }
    }
  }
}

export const realtimeHub = new RealtimeService();
