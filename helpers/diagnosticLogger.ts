/**
 * Diagnostic Logger
 * Captures console logs during contact import for display in UI
 */

export type DiagnosticLog = {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
};

let diagnosticLogs: DiagnosticLog[] = [];
let isCapturing = false;

/**
 * Start capturing diagnostic logs
 */
export function startDiagnosticCapture() {
  diagnosticLogs = [];
  isCapturing = true;
}

/**
 * Stop capturing and return all logs
 */
export function stopDiagnosticCapture(): DiagnosticLog[] {
  isCapturing = false;
  return [...diagnosticLogs];
}

/**
 * Clear all captured logs
 */
export function clearDiagnosticLogs() {
  diagnosticLogs = [];
}

/**
 * Add a diagnostic log entry
 */
export function addDiagnosticLog(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  if (!isCapturing) return;
  
  diagnosticLogs.push({
    timestamp: Date.now(),
    level,
    message,
    data,
  });
}

/**
 * Log info level message
 */
export function logInfo(message: string, data?: any) {
  console.log(`[DiagnosticLogger] ${message}`, data || '');
  addDiagnosticLog('info', message, data);
}

/**
 * Log warning level message
 */
export function logWarn(message: string, data?: any) {
  console.warn(`[DiagnosticLogger] ${message}`, data || '');
  addDiagnosticLog('warn', message, data);
}

/**
 * Log error level message
 */
export function logError(message: string, data?: any) {
  console.error(`[DiagnosticLogger] ${message}`, data || '');
  addDiagnosticLog('error', message, data);
}

/**
 * Get current logs without stopping capture
 */
export function getCurrentLogs(): DiagnosticLog[] {
  return [...diagnosticLogs];
}

/**
 * Check if currently capturing
 */
export function isCapturingLogs(): boolean {
  return isCapturing;
}
