/**
 * Structured logging utility for production observability
 * Outputs JSON for easy parsing by log aggregators (Datadog, CloudWatch, etc.)
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  orgId?: string;
  apiKeyId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private minLevel: LogLevel;

  constructor() {
    // Set minimum log level based on environment
    const env = process.env.NODE_ENV || 'development';
    this.minLevel = env === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const minLevelIndex = levels.indexOf(this.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    return currentLevelIndex >= minLevelIndex;
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      entry.context = context;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    return entry;
  }

  private write(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // In production, output structured JSON
    // In development, pretty-print for readability
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(entry));
    } else {
      const levelColors: Record<LogLevel, string> = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m',  // Green
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m', // Red
        fatal: '\x1b[35m', // Magenta
      };
      const reset = '\x1b[0m';
      const color = levelColors[entry.level] || reset;
      
      console.log(
        `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} - ${entry.message}`,
        entry.context ? `\n  Context:` : '',
        entry.context ? entry.context : '',
        entry.error ? `\n  Error:` : '',
        entry.error ? entry.error : ''
      );
    }
  }

  debug(message: string, context?: LogContext): void {
    this.write(this.formatLog(LogLevel.DEBUG, message, context));
  }

  info(message: string, context?: LogContext): void {
    this.write(this.formatLog(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: LogContext): void {
    this.write(this.formatLog(LogLevel.WARN, message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.write(this.formatLog(LogLevel.ERROR, message, context, error));
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    this.write(this.formatLog(LogLevel.FATAL, message, context, error));
  }

  // Convenience method for HTTP request logging
  http(message: string, context: LogContext): void {
    const level = context.statusCode && context.statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.write(this.formatLog(level, message, context));
  }

  // Convenience method for API metrics
  metric(metricName: string, value: number, context?: LogContext): void {
    this.info(`Metric: ${metricName}`, {
      ...context,
      metric: metricName,
      value,
    });
  }
}

// Singleton instance
export const logger = new Logger();

// Helper to create request-scoped logger with context
export function createRequestLogger(baseContext: LogContext) {
  return {
    debug: (message: string, context?: LogContext) => 
      logger.debug(message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) => 
      logger.info(message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) => 
      logger.warn(message, { ...baseContext, ...context }),
    error: (message: string, error?: Error, context?: LogContext) => 
      logger.error(message, error, { ...baseContext, ...context }),
    fatal: (message: string, error?: Error, context?: LogContext) => 
      logger.fatal(message, error, { ...baseContext, ...context }),
    http: (message: string, context: LogContext) => 
      logger.http(message, { ...baseContext, ...context }),
    metric: (metricName: string, value: number, context?: LogContext) => 
      logger.metric(metricName, value, { ...baseContext, ...context }),
  };
}

// Helper to generate request IDs
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
