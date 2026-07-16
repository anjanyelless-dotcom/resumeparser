import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import util from 'util';

// Create logs directory
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}   

const logFilePath = path.join(logsDir, 'resume_parser.log');

// Simple logger implementation
class Logger {
  private requestId?: string;

  constructor(requestId?: string) {
    this.requestId = requestId;
  }

  private log(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      requestId: this.requestId,
      message,
      ...data
    };

    // Write to file
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logFilePath, logLine);

    // Write to console
    const consoleMsg = `${timestamp} [${level}] ${this.requestId ? `[${this.requestId}] ` : ''}${message}`;
    if (level === 'ERROR') {
      console.error(consoleMsg, data || '');
    } else {
      console.log(consoleMsg, data ? util.inspect(data, { depth: 2, colors: true }) : '');
    }
  }

  info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  debug(message: string, data?: any) {
    this.log('DEBUG', message, data);
  }

  warning(message: string, data?: any) {
    this.log('WARNING', message, data);
  }

  error(message: string, data?: any) {
    this.log('ERROR', message, data);
  }

  child(context: { requestId: string }) {
    return new Logger(context.requestId);
  }
}

const logger = new Logger();

// Extend Express Request to include requestId and logger
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      logger?: InstanceType<typeof Logger>;
    }
  }
}

/**
 * Middleware to add request ID and logger to each request
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID
  const requestId = uuidv4();
  req.requestId = requestId;
  
  // Create child logger with request ID
  const childLogger = logger.child({ requestId });
  req.logger = childLogger;
  
  childLogger.info('📥 INCOMING REQUEST', {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  // Log response when finished
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    req.logger?.info('📤 RESPONSE SENT', {
      statusCode: res.statusCode,
      duration_ms: duration
    });
  });
  
  next();
};

/**
 * Middleware to log file uploads
 */
export const logFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (req.file) {
    req.logger?.info('📎 FILE UPLOADED', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });
  }
  next();
};

/**
 * Error logging middleware
 */
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  req.logger?.error('❌ ERROR OCCURRED', {
    error: err.message,
    stack: err.stack,
    name: err.name
  });
  next(err);
};

export { logger };
