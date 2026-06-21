import { Injectable } from '@nestjs/common';
import { Subject, Observable, map } from 'rxjs';

interface SseEvent {
  event: string;
  data: any;
}

interface SseClient {
  id: string;
  subject: Subject<SseEvent>;
  createdAt: Date;
}

@Injectable()
export class SseService {
  private clients: Map<string, SseClient> = new Map();
  private mediaClients: Map<string, SseClient> = new Map();

  createConnection(): { clientId: string; observable: Observable<MessageEvent> } {
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const subject = new Subject<SseEvent>();

    this.clients.set(clientId, {
      id: clientId,
      subject,
      createdAt: new Date(),
    });

    setTimeout(() => {
      subject.next({
        event: 'connected',
        data: { clientId, timestamp: new Date().toISOString() },
      });
    }, 0);

    const observable = subject.asObservable().pipe(
      map((evt) => ({ type: evt.event, data: JSON.stringify(evt.data) }) as any),
    );

    return { clientId, observable: observable as unknown as Observable<MessageEvent> };
  }

  createMediaConnection(): { clientId: string; observable: Observable<MessageEvent> } {
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const subject = new Subject<SseEvent>();

    this.mediaClients.set(clientId, {
      id: clientId,
      subject,
      createdAt: new Date(),
    });

    setTimeout(() => {
      subject.next({
        event: 'connected',
        data: { clientId, timestamp: new Date().toISOString() },
      });
    }, 0);

    const observable = subject.asObservable().pipe(
      map((evt) => ({ type: evt.event, data: JSON.stringify(evt.data) }) as any),
    );

    return { clientId, observable: observable as unknown as Observable<MessageEvent> };
  }

  removeClient(clientId: string) {
    this.clients.delete(clientId);
    this.mediaClients.delete(clientId);
  }

  broadcast(event: string, data: any) {
    const payload = { event, data };
    this.clients.forEach((client) => {
      try {
        client.subject.next(payload);
      } catch {
        this.clients.delete(client.id);
      }
    });
  }

  broadcastMedia(event: string, data: any) {
    const payload = { event, data };
    this.mediaClients.forEach((client) => {
      try {
        client.subject.next(payload);
      } catch {
        this.mediaClients.delete(client.id);
      }
    });
  }
}