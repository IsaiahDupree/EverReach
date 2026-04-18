import { useState, useEffect } from 'react';
import { MessageQueue, InAppMessage } from '@/lib/messaging/MessageQueue';

export function useInAppMessages() {
  const [message, setMessage] = useState<InAppMessage | null>(null);

  useEffect(() => {
    const unsubscribe = MessageQueue.subscribe(setMessage);
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    message,
    showMessage: MessageQueue.show.bind(MessageQueue),
    dismissMessage: MessageQueue.dismiss.bind(MessageQueue),
  };
}
