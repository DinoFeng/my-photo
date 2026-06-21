import { SSEService, SSEClient } from '../utils/sse';

export const monitorService = new SSEService<SSEClient>();
export const mediaUpdateService = new SSEService<SSEClient>();

export const broadcastTask = (event: string, type: string, payload: any, error?: string) => {
  monitorService.broadcast({
    event,
    data: { type, payload, error }
  });
};