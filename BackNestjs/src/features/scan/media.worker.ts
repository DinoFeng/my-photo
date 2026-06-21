import { parentPort, isMainThread } from 'node:worker_threads';
import fs from 'node:fs';
import crypto from 'node:crypto';
import ExifReader from 'exifreader';

const HASH_SAMPLE_SIZE = 64 * 1024;
const EXIF_READ_SIZE = 128 * 1024;

interface WorkerRequest {
  filePath: string;
}

interface WorkerResponse {
  hash: string;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    make?: string;
    model?: string;
    dateTaken?: string;
    latitude?: number;
    longitude?: number;
  };
  error?: string;
}

function parseExifDate(dateStr: string): Date | null {
  const normalized = dateStr
    .replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
    .replace(' ', 'T');
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function gpsToDecimal(coords: number[], ref?: string): number {
  const [degrees, minutes, seconds] = coords;
  let decimal = degrees + minutes / 60 + seconds / 3600;
  if (ref === 'S' || ref === 'W') decimal = -decimal;
  return decimal;
}

async function calculateFileHash(filePath: string): Promise<string> {
  const { size } = await fs.promises.stat(filePath);

  const hash = crypto.createHash('sha256');
  hash.update(String(size));

  const fd = await fs.promises.open(filePath, 'r');
  try {
    const head = Buffer.alloc(HASH_SAMPLE_SIZE);
    const headResult = await fd.read(head, 0, HASH_SAMPLE_SIZE, 0);
    hash.update(head.subarray(0, headResult.bytesRead));

    if (size > HASH_SAMPLE_SIZE) {
      const tail = Buffer.alloc(HASH_SAMPLE_SIZE);
      const tailOffset = Math.max(HASH_SAMPLE_SIZE, size - HASH_SAMPLE_SIZE);
      const tailResult = await fd.read(tail, 0, HASH_SAMPLE_SIZE, tailOffset);
      hash.update(tail.subarray(0, tailResult.bytesRead));
    }
  } finally {
    await fd.close();
  }

  return hash.digest('hex');
}

async function getFileMetadata(filePath: string): Promise<WorkerResponse['metadata']> {
  try {
    const tags = await ExifReader.load(filePath, { length: EXIF_READ_SIZE });

    const result: WorkerResponse['metadata'] = {};

    if (tags['Image Width']) result.width = Number(tags['Image Width'].value);
    if (tags['Image Height']) result.height = Number(tags['Image Height'].value);
    if (tags['Make']) result.make = tags['Make'].description as string;
    if (tags['Model']) result.model = tags['Model'].description as string;

    if (tags['DateTimeOriginal']) {
      const dt = parseExifDate(String(tags['DateTimeOriginal'].description));
      if (dt) result.dateTaken = dt.toISOString();
    }
    if (!result.dateTaken && tags['DateTimeDigitized']) {
      const dt = parseExifDate(String(tags['DateTimeDigitized'].description));
      if (dt) result.dateTaken = dt.toISOString();
    }
    if (!result.dateTaken && tags['DateTime']) {
      const dt = parseExifDate(String(tags['DateTime'].description));
      if (dt) result.dateTaken = dt.toISOString();
    }

    if (tags['GPSLatitude'] && tags['GPSLongitude']) {
      const latValue = tags['GPSLatitude'].value;
      const lngValue = tags['GPSLongitude'].value;
      const latRef = typeof tags['GPSLatitudeRef']?.value === 'string' ? (tags['GPSLatitudeRef'].value as string) : undefined;
      const lngRef = typeof tags['GPSLongitudeRef']?.value === 'string' ? (tags['GPSLongitudeRef'].value as string) : undefined;
      if (
        Array.isArray(latValue) &&
        Array.isArray(lngValue) &&
        latValue.every((v) => typeof v === 'number') &&
        lngValue.every((v) => typeof v === 'number')
      ) {
        result.latitude = gpsToDecimal(latValue as unknown as number[], latRef);
        result.longitude = gpsToDecimal(lngValue as unknown as number[], lngRef);
      }
    }

    return result;
  } catch {
    return {};
  }
}

if (!isMainThread && parentPort) {
  parentPort.on('message', async (req: WorkerRequest) => {
    try {
      const [hash, metadata] = await Promise.all([
        calculateFileHash(req.filePath),
        getFileMetadata(req.filePath),
      ]);
      parentPort!.postMessage({ hash, metadata } as WorkerResponse);
    } catch (err) {
      parentPort!.postMessage({
        hash: '',
        metadata: {},
        error: err instanceof Error ? err.message : String(err),
      } as WorkerResponse);
    }
  });
}