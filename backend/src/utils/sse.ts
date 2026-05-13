import { Response } from 'express';

export interface SSEClient {
  res: Response;
  lastActivity: number;
  [key: string]: any;
}

export interface SSEEvent {
  event: string;
  data: any;
}

export class SSEService<T extends SSEClient = SSEClient> {
  private clients: Map<string, T> = new Map();
  private heartbeatInterval: number = 30000;

  constructor(heartbeatInterval?: number) {
    if (heartbeatInterval) {
      this.heartbeatInterval = heartbeatInterval;
    }
  }

  addClient(clientId: string, client: T): void {
    this.clients.set(clientId, client);
    this.startHeartbeat(clientId);
  }

  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  getClient(clientId: string): T | undefined {
    return this.clients.get(clientId);
  }

  getClients(): Map<string, T> {
    return this.clients;
  }

  getClientsByFilter(filter: (client: T) => boolean): T[] {
    const result: T[] = [];
    this.clients.forEach((client) => {
      if (filter(client)) {
        result.push(client);
      }
    });
    return result;
  }

  sendEvent(clientId: string, event: SSEEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    try {
      const data = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
      client.res.write(data);
      client.lastActivity = Date.now();
      return true;
    } catch {
      this.clients.delete(clientId);
      return false;
    }
  }

  broadcast(event: SSEEvent): void {
    this.clients.forEach((client, clientId) => {
      this.sendEvent(clientId, event);
    });
  }

  broadcastToFiltered(filter: (client: T) => boolean, event: SSEEvent): void {
    this.clients.forEach((client, clientId) => {
      if (filter(client)) {
        this.sendEvent(clientId, event);
      }
    });
  }

  private startHeartbeat(clientId: string): void {
    const interval = setInterval(() => {
      const client = this.clients.get(clientId);
      if (!client) {
        clearInterval(interval);
        return;
      }

      try {
        client.res.write(': keep-alive\n\n');
        client.lastActivity = Date.now();
      } catch {
        clearInterval(interval);
        this.clients.delete(clientId);
      }
    }, this.heartbeatInterval);
  }

  setupConnection(
    res: Response,
    additionalData?: Partial<T>
  ): { clientId: string; client: T } {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const client: T = {
      res,
      lastActivity: Date.now(),
      ...(additionalData as object)
    } as T;

    this.addClient(clientId, client);

    return { clientId, client };
  }
}

export const scanProgressService = new SSEService<SSEClient & { sourceDirectoryId?: string }>();
export const mediaUpdateService = new SSEService();

export function broadcastScanProgress(sourceDirectoryId: string, checkpoint: any): void {
  scanProgressService.broadcastToFiltered(
    (client) => client.sourceDirectoryId === sourceDirectoryId,
    { event: 'progress', data: checkpoint }
  );
}

export function broadcastMediaAdded(sourceDirectoryId: string, mediaItem: any): void {
  const event: SSEEvent = { event: 'media-added', data: mediaItem };
  
  scanProgressService.broadcastToFiltered(
    (client) => client.sourceDirectoryId === sourceDirectoryId,
    event
  );
  
  mediaUpdateService.broadcast(event);
}