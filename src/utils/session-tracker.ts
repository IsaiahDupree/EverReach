import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_ID_KEY = 'suntrace_session_id';
const SESSION_START_KEY = 'suntrace_session_start';

export interface SessionData {
  sessionId: string;
  startTime: number;
  lastActivityTime: number;
  eventCount: number;
}

export interface SessionConfig {
  sessionTimeoutMs?: number;
}

export class SessionTracker {
  private session: SessionData | null = null;
  private config: Required<SessionConfig>;
  private activityTimer: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor(config: SessionConfig = {}) {
    this.config = {
      sessionTimeoutMs: config.sessionTimeoutMs ?? 30 * 60 * 1000, // 30 minutes
    };
  }

  /**
   * Initialize session, creating a new one if needed
   */
  async initialize(): Promise<SessionData> {
    if (this.initialized && this.session) {
      return this.session;
    }

    try {
      const storedSessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
      const storedStartTime = await AsyncStorage.getItem(SESSION_START_KEY);

      const now = Date.now();
      let sessionId: string;
      let startTime: number;
      let needsNewSession = true;

      if (storedSessionId && storedStartTime) {
        const parsedStartTime = parseInt(storedStartTime, 10);
        // Check if session is still valid (not expired)
        if (now - parsedStartTime < this.config.sessionTimeoutMs) {
          sessionId = storedSessionId;
          startTime = parsedStartTime;
          needsNewSession = false;
        }
      }

      if (needsNewSession) {
        sessionId = uuidv4();
        startTime = now;
        await AsyncStorage.setItem(SESSION_ID_KEY, sessionId);
        await AsyncStorage.setItem(SESSION_START_KEY, startTime.toString());
      }

      this.session = {
        sessionId,
        startTime,
        lastActivityTime: now,
        eventCount: 0,
      };

      this.setupActivityTimeout();
      this.initialized = true;
      return this.session;
    } catch (error) {
      console.error('Error initializing session:', error);
      // Fallback
      this.session = {
        sessionId: uuidv4(),
        startTime: Date.now(),
        lastActivityTime: Date.now(),
        eventCount: 0,
      };
      this.initialized = true;
      return this.session;
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<SessionData> {
    if (!this.initialized) {
      return this.initialize();
    }
    return this.session!;
  }

  /**
   * Record activity and update session
   */
  async recordActivity(): Promise<void> {
    const session = await this.getSession();
    session.lastActivityTime = Date.now();
    session.eventCount += 1;
    this.setupActivityTimeout();
  }

  /**
   * Check if session has expired
   */
  isSessionExpired(): boolean {
    if (!this.session) return true;
    const elapsed = Date.now() - this.session.lastActivityTime;
    return elapsed > this.config.sessionTimeoutMs;
  }

  /**
   * End current session
   */
  async endSession(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([SESSION_ID_KEY, SESSION_START_KEY]);
      this.session = null;
      if (this.activityTimer) {
        clearTimeout(this.activityTimer);
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  /**
   * Create a new session
   */
  async startNewSession(): Promise<SessionData> {
    await this.endSession();
    this.initialized = false;
    return this.initialize();
  }

  /**
   * Get session duration in milliseconds
   */
  getSessionDuration(): number {
    if (!this.session) return 0;
    return Date.now() - this.session.startTime;
  }

  /**
   * Get event count in current session
   */
  getEventCount(): number {
    return this.session?.eventCount ?? 0;
  }

  /**
   * Setup timeout to detect inactivity and create new session
   */
  private setupActivityTimeout(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    this.activityTimer = setTimeout(() => {
      if (this.isSessionExpired()) {
        this.startNewSession().catch((error) =>
          console.error('Error starting new session:', error)
        );
      }
    }, this.config.sessionTimeoutMs);
  }

  /**
   * Reset everything (for testing)
   */
  async reset(): Promise<void> {
    await this.endSession();
    this.initialized = false;
  }
}

// Global instance
let globalSessionTracker: SessionTracker | null = null;

export function getSessionTracker(config?: SessionConfig): SessionTracker {
  if (!globalSessionTracker) {
    globalSessionTracker = new SessionTracker(config);
  }
  return globalSessionTracker;
}

export function resetSessionTracker(): void {
  globalSessionTracker = null;
}
