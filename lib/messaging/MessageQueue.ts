export interface InAppMessage {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'error' | 'success';
  action?: {
    label: string;
    onPress: () => void;
  };
  duration?: number; // milliseconds, 0 for persistent
  dismissible?: boolean;
}

export class MessageQueue {
  private static queue: InAppMessage[] = [];
  private static listeners: ((message: InAppMessage | null) => void)[] = [];
  private static currentMessage: InAppMessage | null = null;
  private static timeoutId: NodeJS.Timeout | null = null;

  static subscribe(callback: (message: InAppMessage | null) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  static show(message: InAppMessage) {
    this.queue.push(message);
    this.processNext();
  }

  static dismiss() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.currentMessage = null;
    this.notify(null);
    this.processNext();
  }

  private static processNext() {
    if (this.currentMessage) return; // Already showing
    if (this.queue.length === 0) return; // Nothing to show

    this.currentMessage = this.queue.shift()!;
    this.notify(this.currentMessage);

    const duration = this.currentMessage.duration ?? 3000;
    if (duration > 0) {
      this.timeoutId = setTimeout(() => {
        this.dismiss();
      }, duration);
    }
  }

  private static notify(message: InAppMessage | null) {
    this.listeners.forEach(listener => listener(message));
  }

  static clear() {
    this.queue = [];
    this.currentMessage = null;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
