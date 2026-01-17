/**
 * Payment Event Logger
 * 
 * Centralized event tracking for RevenueCat and Superwall
 * Logs to console, analytics, and in-memory store for debugging
 */

export interface PaymentEvent {
  id: string;
  timestamp: number;
  source: 'revenuecat' | 'superwall';
  type: string;
  data: any;
  metadata?: Record<string, any>;
}

class PaymentEventLogger {
  private events: PaymentEvent[] = [];
  private maxEvents = 100; // Keep last 100 events in memory
  private listeners: Array<(event: PaymentEvent) => void> = [];

  /**
   * Log a RevenueCat event
   */
  logRevenueCat(type: string, data: any, metadata?: Record<string, any>) {
    const event: PaymentEvent = {
      id: `rc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      source: 'revenuecat',
      type,
      data,
      metadata,
    };

    this.addEvent(event);
    console.log(`[RevenueCat Event] ${type}:`, data);
  }

  /**
   * Log a Superwall event
   */
  logSuperwall(type: string, data: any, metadata?: Record<string, any>) {
    const event: PaymentEvent = {
      id: `sw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      source: 'superwall',
      type,
      data,
      metadata,
    };

    this.addEvent(event);
    console.log(`[Superwall Event] ${type}:`, data);
  }

  /**
   * Add event to in-memory store
   */
  private addEvent(event: PaymentEvent) {
    this.events.unshift(event); // Add to beginning
    
    // Keep only last N events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (err) {
        console.error('[PaymentEventLogger] Listener error:', err);
      }
    });
  }

  /**
   * Get all events
   */
  getEvents(): PaymentEvent[] {
    return [...this.events];
  }

  /**
   * Get events by source
   */
  getEventsBySource(source: 'revenuecat' | 'superwall'): PaymentEvent[] {
    return this.events.filter(e => e.source === source);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string): PaymentEvent[] {
    return this.events.filter(e => e.type === type);
  }

  /**
   * Clear all events
   */
  clearEvents() {
    this.events = [];
    console.log('[PaymentEventLogger] Events cleared');
  }

  /**
   * Subscribe to events
   */
  subscribe(listener: (event: PaymentEvent) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Export events as JSON
   */
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Get event summary
   */
  getSummary() {
    const revenueCatCount = this.events.filter(e => e.source === 'revenuecat').length;
    const superwallCount = this.events.filter(e => e.source === 'superwall').length;
    
    const typeGroups: Record<string, number> = {};
    this.events.forEach(e => {
      typeGroups[e.type] = (typeGroups[e.type] || 0) + 1;
    });

    return {
      total: this.events.length,
      revenueCat: revenueCatCount,
      superwall: superwallCount,
      types: typeGroups,
      oldest: this.events[this.events.length - 1]?.timestamp,
      newest: this.events[0]?.timestamp,
    };
  }
}

// Singleton instance
export const paymentEventLogger = new PaymentEventLogger();

// Convenience methods
export const logRevenueCatEvent = (type: string, data: any, metadata?: Record<string, any>) => {
  paymentEventLogger.logRevenueCat(type, data, metadata);
};

export const logSuperwallEvent = (type: string, data: any, metadata?: Record<string, any>) => {
  paymentEventLogger.logSuperwall(type, data, metadata);
};
