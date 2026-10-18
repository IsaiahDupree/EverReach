import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface GoalSuggestion {
  id: string;
  goal: string;
  goal_key: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  category: 'nurture' | 're-engage' | 'convert' | 'maintain';
  confidence: number;
}

interface UseGoalSuggestionsResult {
  suggestions: GoalSuggestion[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useGoalSuggestions(contactId: string): UseGoalSuggestionsResult {
  const [suggestions, setSuggestions] = useState<GoalSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSuggestions = async () => {
    if (!contactId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/v1/contacts/${contactId}/goal-suggestions`, {
        requireAuth: true,
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('[useGoalSuggestions] Unauthorized - session may be expired');
          throw new Error('Authentication required');
        }
        throw new Error(`Failed to fetch goal suggestions: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[useGoalSuggestions] Fetched suggestions:', data.suggestions?.length || 0);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('[useGoalSuggestions] Error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  return {
    suggestions,
    loading,
    error,
    refetch: fetchSuggestions,
  };
}
