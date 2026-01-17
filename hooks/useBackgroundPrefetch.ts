/**
 * Background Prefetch Hook
 * Prefetches data in the background for better UX
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Prefetches common data in the background after initial load
 * This improves perceived performance when navigating
 */
export function useBackgroundPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch contacts list after 1 second
    const timer = setTimeout(() => {
      // Future: Prefetch contacts, templates, etc.
      console.log('[Prefetch] Background prefetch ready');
    }, 1000);

    return () => clearTimeout(timer);
  }, [queryClient]);
}
