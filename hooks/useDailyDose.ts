/**
 * useDailyDose.ts
 *
 * Reads daily_summaries for today (or provided date).
 * Subscribes to realtime updates so display refreshes when sessions are scored.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type OverexposureRisk = 'low' | 'moderate' | 'high' | 'very_high';

export interface DailyDose {
  uvDoseScore: number;
  daylightMinutes: number;
  morningLightMinutes: number;
  overexposureRisk: OverexposureRisk;
  remainingSuggestedMin: number | null;
  sessionCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Reads daily dose data from daily_summaries table.
 * If date is not provided, uses today's date (local timezone).
 */
export function useDailyDose(date?: string): DailyDose {
  const [uvDoseScore, setUvDoseScore] = useState(0);
  const [daylightMinutes, setDaylightMinutes] = useState(0);
  const [morningLightMinutes, setMorningLightMinutes] = useState(0);
  const [overexposureRisk, setOverexposureRisk] = useState<OverexposureRisk>('low');
  const [remainingSuggestedMin, setRemainingSuggestedMin] = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const getDateLocal = useCallback(() => {
    if (date) return date;
    const now = new Date();
    return now.toISOString().split('T')[0];
  }, [date]);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.user?.id) {
        setIsLoading(false);
        return;
      }

      const dateLocal = getDateLocal();

      const { data: summary, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('date_local', dateLocal)
        .single();

      if (error?.code === 'PGRST116') {
        // Not found — initialize empty
        setUvDoseScore(0);
        setDaylightMinutes(0);
        setMorningLightMinutes(0);
        setOverexposureRisk('low');
        setSessionCount(0);
        setRemainingSuggestedMin(null);
      } else if (error) {
        console.warn('[useDailyDose] Error:', error);
      } else if (summary) {
        setUvDoseScore(summary.uv_dose_score ?? 0);
        setDaylightMinutes(summary.daylight_minutes ?? 0);
        setMorningLightMinutes(summary.morning_light_minutes ?? 0);
        setOverexposureRisk(summary.overexposure_risk ?? 'low');
        setRemainingSuggestedMin(summary.remaining_suggested_min ?? null);
        setSessionCount(summary.session_count ?? 0);
      }

      setIsLoading(false);
    } catch (error) {
      console.warn('[useDailyDose] Refresh error:', error);
      setIsLoading(false);
    }
  }, [getDateLocal]);

  // Load on mount + subscribe to changes
  useEffect(() => {
    const { data: user } = supabase.auth.getUser();
    if (!user?.user?.id) {
      setIsLoading(false);
      return;
    }

    refresh();

    // Subscribe to realtime updates on daily_summaries
    const subscription = supabase
      .channel(`daily_${user.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_summaries',
          filter: `user_id=eq.${user.user.id}`,
        },
        (payload) => {
          if (payload.new) {
            const summary = payload.new as any;
            if (summary.date_local === getDateLocal()) {
              setUvDoseScore(summary.uv_dose_score ?? 0);
              setDaylightMinutes(summary.daylight_minutes ?? 0);
              setMorningLightMinutes(summary.morning_light_minutes ?? 0);
              setOverexposureRisk(summary.overexposure_risk ?? 'low');
              setRemainingSuggestedMin(summary.remaining_suggested_min ?? null);
              setSessionCount(summary.session_count ?? 0);
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [refresh, getDateLocal]);

  return {
    uvDoseScore,
    daylightMinutes,
    morningLightMinutes,
    overexposureRisk,
    remainingSuggestedMin,
    sessionCount,
    isLoading,
    refresh,
  };
}
