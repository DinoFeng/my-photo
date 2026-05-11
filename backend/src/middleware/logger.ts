import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  ip: string;
  userAgent: string;
}

const LOG_DIR = path.join(__dirname, '../../logs');
const ACCESS_LOG = path.join(LOG_DIR, 'access.log');
const ERROR_LOG = path.join(LOG_DIR, 'error.log');

const isProduction = process.env.NODE_ENV === 'production';

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function formatLogEntry(entry: LogEntry): string {
  const { timestamp, method, url, status, duration, ip, userAgent } = entry;
  return `${timestamp} [${method}] ${url} - ${status} (${duration}ms) - ${ip} - "${userAgent}"\n`;
}

export function accessLogger(req: Request, res: Response, next: NextFunction) {
  ensureLogDir();
  
  const start = Date.now();
  const { method, originalUrl: url, ip, headers } = req;
  const userAgent = headers['user-agent'] || '';
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      method,
      url,
      status: res.statusCode,
      duration,
      ip: ip || 'unknown',
      userAgent
    };
    
    const logLine = formatLogEntry(entry);
    
    if (isProduction) {
      fs.appendFile(ACCESS_LOG, logLine, (err) => {
        if (err) console.error('Failed to write access log:', err);
      });
    } else {
      console.log(logLine.trim());
    }
  });
  
  next();
}

export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  ensureLogDir();
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    stack: err.stack,
    ip: req.ip
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  
  if (isProduction) {
    fs.appendFile(ERROR_LOG, logLine, (err) => {
      if (err) console.error('Failed to write error log:', err);
    });
  } else {
    console.error('Error:', err);
  }
  
  next(err);
}

export default { accessLogger, errorLogger };
