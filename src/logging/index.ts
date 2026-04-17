/**
 * Structured logging infrastructure
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: string;
}

class Logger {
  private minLevel: LogLevel = 'info';

  constructor(minLevel?: LogLevel) {
    if (minLevel) {
      this.minLevel = minLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.minLevel];
  }

  private format(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.log(this.format({ timestamp: new Date().toISOString(), level: 'debug', message, context }));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.log(this.format({ timestamp: new Date().toISOString(), level: 'info', message, context }));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format({ timestamp: new Date().toISOString(), level: 'warn', message, context }));
    }
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(this.format({
        timestamp: new Date().toISOString(),
        level: 'error',
        message,
        error: errorMessage,
        context,
      }));
    }
  }
}

const globalLogger = new Logger();

export function getLogger(minLevel?: LogLevel): Logger {
  return minLevel ? new Logger(minLevel) : globalLogger;
}

export default globalLogger;
