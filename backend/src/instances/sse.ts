import { SSEService, SSEClient } from '../utils/sse';

export const scanProgressService = new SSEService<SSEClient & { sourceDirectoryId?: string }>();
export const mediaUpdateService = new SSEService();