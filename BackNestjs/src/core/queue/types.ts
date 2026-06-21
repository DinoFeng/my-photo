export interface ScanPayload {
  currentPath: string;
  type: 'directory' | 'file';
  sourcePath: string;
}