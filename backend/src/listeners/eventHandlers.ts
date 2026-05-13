import { eventBus } from '../utils/eventBus';
import { scanProgressService, mediaUpdateService } from '../utils/sse';

export function registerEventHandlers(): void {
  eventBus.on<{ sourceDirectoryId: string; checkpoint: any }>(
    'scanProgressUpdated',
    async ({ sourceDirectoryId, checkpoint }) => {
      scanProgressService.broadcastToFiltered(
        (client) => client.sourceDirectoryId === sourceDirectoryId,
        { event: 'progress', data: checkpoint }
      );
    }
  );

  eventBus.on<{ sourceDirectoryId: string; mediaItem: any }>(
    'mediaAdded',
    async ({ sourceDirectoryId, mediaItem }) => {
      const sseEvent = { event: 'media-added', data: mediaItem };

      scanProgressService.broadcastToFiltered(
        (client) => client.sourceDirectoryId === sourceDirectoryId,
        sseEvent
      );

      mediaUpdateService.broadcast(sseEvent);
    }
  );
}