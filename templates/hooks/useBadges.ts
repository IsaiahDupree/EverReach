/**
 * useBadges
 *
 * Loads all badge definitions and the current user's earned badges.
 * Merges them into a unified list so UI components can render both
 * earned and locked states from a single source.
 *
 * Returns:
 *   userBadges    UserBadge[] — rows from user_badges (earned only)
 *   allBadges     Badge[]     — all badge definitions
 *   mergedBadges  Array of { badge, earned, earned_at? } — ready for BadgeGrid
 *   unlockedIds   Set<string> — badge IDs the user has earned
 *   isLoading     boolean
 *   error         string | null
 *   refetch       () => void
 */

import { useState, useEffect, useCallback } from 'react';
import { getUserBadges, getBadges } from '@/services/api';
import { Badge, UserBadge } from '@/types/models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MergedBadge {
  badge: Badge;
  earned: boolean;
  earned_at?: string;
}

interface UseBadgesResult {
  userBadges: UserBadge[];
  allBadges: Badge[];
  mergedBadges: MergedBadge[];
  unlockedIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBadges(): UseBadgesResult {
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch both in parallel
      const [earned, all] = await Promise.all([getUserBadges(), getBadges()]);
      setUserBadges(earned);
      setAllBadges(all);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load badges';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  // Build a Set of earned badge IDs for O(1) lookup
  const unlockedIds: Set<string> = new Set(userBadges.map((ub) => ub.badge_id));

  // Build the earned_at index for quick access
  const earnedAtByBadgeId: Map<string, string> = new Map(
    userBadges.map((ub) => [ub.badge_id, ub.earned_at])
  );

  // Merge: sort so earned badges appear first, then by requirement_value ascending
  const mergedBadges: MergedBadge[] = allBadges
    .map((badge) => ({
      badge,
      earned: unlockedIds.has(badge.id),
      earned_at: earnedAtByBadgeId.get(badge.id),
    }))
    .sort((a, b) => {
      if (a.earned && !b.earned) return -1;
      if (!a.earned && b.earned) return 1;
      return a.badge.requirement_value - b.badge.requirement_value;
    });

  return {
    userBadges,
    allBadges,
    mergedBadges,
    unlockedIds,
    isLoading,
    error,
    refetch,
  };
}

export default useBadges;
