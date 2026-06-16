import { SSEService, SSEClient } from '../utils/sse';

export const scanProgressService = new SSEService<SSEClient & { sourceDirectoryId?: string }>();
export const mediaUpdateService = new SSEService();
export const monitorService = new SSEService<SSEClient>();

export const broadcastTask = (event: string, type: string, payload: any, error?: string) => {
  monitorService.broadcast({
    event,
    data: { type, payload, error }
  });
};