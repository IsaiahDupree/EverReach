/**
 * Centralized Warmth Score Manager
 * 
 * Handles warmth score fetching, caching, and bulk operations
 * with 5-minute cache freshness and efficient batch processing.
 */

import { apiFetch } from './api';

export type WarmthMode = 'slow' | 'medium' | 'fast' | 'test';

export type WarmthBand = 'hot' | 'warm' | 'neutral' | 'cool' | 'cold';

export interface WarmthScore {
  score: number;
  band: WarmthBand;
  mode?: WarmthMode;
  lastInteractionAt?: string;
  fetchedAt: number;
}

export interface WarmthModeInfo {
  mode: WarmthMode;
  lambda: number;
  halfLifeDays: number;
  daysToReachout: number;
  description: string;
}

export interface WarmthSummary {
  total_contacts: number;
  by_band: {
    hot: number;
    warm: number;
    neutral: number;
    cool: number;
    cold: number;
  };
  average_score: number;
  contacts_needing_attention: number;
  last_updated_at: string;
}

export interface BulkRecomputeResult {
  id: string;
  warmth?: number;
  warmth_band?: WarmthBand;
  error?: string;
}

// Cache freshness: 5 minutes
const CACHE_FRESHNESS_MS = 5 * 60 * 1000;

// Maximum contacts per bulk request
const MAX_BULK_SIZE = 200;

export class WarmthManager {
  private cache: Map<string, WarmthScore> = new Map();
  private pendingRequests: Map<string, Promise<WarmthScore>> = new Map();

  constructor() {
    console.log('[WarmthManager] Initialized');
  }

  /**
   * Get warmth score for a single contact
   * Uses cache if fresh, otherwise fetches from API
   */
  async getWarmth(contactId: string, forceRefresh = false): Promise<WarmthScore> {
    // Check for pending request to avoid duplicates
    if (!forceRefresh && this.pendingRequests.has(contactId)) {
      return this.pendingRequests.get(contactId)!;
    }

    // Check cache first
    if (!forceRefresh && this.cache.has(contactId)) {
      const cached = this.cache.get(contactId)!;
      // Return if fresh (< 5 minutes old)
      if (Date.now() - cached.fetchedAt < CACHE_FRESHNESS_MS) {
        return cached;
      }
    }

    // Create fetch promise
    const fetchPromise = this._fetchSingleWarmth(contactId);
    this.pendingRequests.set(contactId, fetchPromise);

    try {
      const score = await fetchPromise;
      this.pendingRequests.delete(contactId);
      return score;
    } catch (error) {
      this.pendingRequests.delete(contactId);
      throw error;
    }
  }

  private async _fetchSingleWarmth(contactId: string): Promise<WarmthScore> {
    try {
      const response = await apiFetch(`/api/v1/contacts/${contactId}/warmth/recompute`, {
        method: 'POST',
        requireAuth: true,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch warmth: ${response.status}`);
      }

      const data = await response.json();
      const score: WarmthScore = {
        score: data.warmth_score || data.contact?.warmth || 0,
        band: (data.contact?.warmth_band || 'cold') as WarmthBand,
        mode: data.contact?.warmth_mode,
        lastInteractionAt: data.contact?.last_interaction_at,
        fetchedAt: Date.now(),
      };

      this.cache.set(contactId, score);
      return score;
    } catch (error) {
      console.error(`[WarmthManager] Error fetching warmth for ${contactId}:`, error);
      throw error;
    }
  }

  /**
   * Bulk fetch warmth for multiple contacts
   * Automatically chunks requests to respect API limits
   */
  async getBulkWarmth(
    contactIds: string[],
    forceRefresh = false
  ): Promise<Map<string, WarmthScore>> {
    const now = Date.now();
    const results = new Map<string, WarmthScore>();

    // Deduplicate
    const uniqueIds = Array.from(new Set(contactIds));

    // Filter out cached contacts (if not forcing refresh)
    const needFetch: string[] = [];
    const fromCache: string[] = [];

    for (const id of uniqueIds) {
      if (!forceRefresh && this.cache.has(id)) {
        const cached = this.cache.get(id)!;
        if (now - cached.fetchedAt < CACHE_FRESHNESS_MS) {
          results.set(id, cached);
          fromCache.push(id);
          continue;
        }
      }
      needFetch.push(id);
    }

    console.log(`[WarmthManager] Bulk fetch: ${fromCache.length} cached, ${needFetch.length} to fetch`);

    if (needFetch.length === 0) {
      return results;
    }

    // Chunk into batches of MAX_BULK_SIZE
    const chunks: string[][] = [];
    for (let i = 0; i < needFetch.length; i += MAX_BULK_SIZE) {
      chunks.push(needFetch.slice(i, i + MAX_BULK_SIZE));
    }

    // Fetch all chunks in parallel
    const chunkPromises = chunks.map(chunk => this._fetchBulkChunk(chunk));
    const chunkResults = await Promise.all(chunkPromises);

    // Merge results
    chunkResults.forEach(chunkMap => {
      chunkMap.forEach((score, id) => {
        results.set(id, score);
      });
    });

    return results;
  }

  private async _fetchBulkChunk(contactIds: string[]): Promise<Map<string, WarmthScore>> {
    const results = new Map<string, WarmthScore>();

    try {
      const response = await apiFetch('/api/v1/warmth/recompute', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ contact_ids: contactIds }),
      });

      if (!response.ok) {
        console.error('[WarmthManager] Bulk recompute failed:', response.status);
        return results;
      }

      const data = await response.json();
      const bulkResults: BulkRecomputeResult[] = data.results || [];

      const now = Date.now();
      bulkResults.forEach(result => {
        if (result.error) {
          console.warn(`[WarmthManager] Error for ${result.id}:`, result.error);
          return;
        }

        const score: WarmthScore = {
          score: result.warmth || 0,
          band: (result.warmth_band || 'cold') as WarmthBand,
          fetchedAt: now,
        };

        this.cache.set(result.id, score);
        results.set(result.id, score);
      });
    } catch (error) {
      console.error('[WarmthManager] Bulk fetch error:', error);
    }

    return results;
  }

  /**
   * Get warmth summary statistics
   */
  async getSummary(): Promise<WarmthSummary | null> {
    try {
      const response = await apiFetch('/api/v1/warmth/summary', {
        method: 'GET',
        requireAuth: true,
      });

      if (!response.ok) {
        console.error('[WarmthManager] Summary fetch failed:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[WarmthManager] Error fetching summary:', error);
      return null;
    }
  }

  /**
   * Get available warmth modes
   */
  async getModes(): Promise<WarmthModeInfo[]> {
    try {
      const response = await apiFetch('/api/v1/warmth/modes', {
        method: 'GET',
        requireAuth: true,
      });

      if (!response.ok) {
        console.error('[WarmthManager] Modes fetch failed:', response.status);
        return this._getDefaultModes();
      }

      const data = await response.json();
      return data.modes || this._getDefaultModes();
    } catch (error) {
      console.error('[WarmthManager] Error fetching modes:', error);
      return this._getDefaultModes();
    }
  }

  private _getDefaultModes(): WarmthModeInfo[] {
    return [
      {
        mode: 'slow',
        lambda: 0.040132,
        halfLifeDays: 17.3,
        daysToReachout: 29.9,
        description: '~30 days between touches',
      },
      {
        mode: 'medium',
        lambda: 0.085998,
        halfLifeDays: 8.1,
        daysToReachout: 13.9,
        description: '~14 days between touches',
      },
      {
        mode: 'fast',
        lambda: 0.171996,
        halfLifeDays: 4.0,
        daysToReachout: 7.0,
        description: '~7 days between touches',
      },
      {
        mode: 'test',
        lambda: 2.407946,
        halfLifeDays: 0.7,
        daysToReachout: 0.5,
        description: '~12 hours (testing only)',
      },
    ];
  }

  /**
   * Get contact's current warmth mode
   */
  async getContactMode(contactId: string): Promise<{
    mode: WarmthMode;
    score: number;
    band: WarmthBand;
    lastInteractionAt?: string;
  } | null> {
    try {
      const response = await apiFetch(`/api/v1/contacts/${contactId}/warmth/mode`, {
        method: 'GET',
        requireAuth: true,
      });

      if (!response.ok) {
        console.error('[WarmthManager] Mode fetch failed:', response.status);
        return null;
      }

      const data = await response.json();
      return {
        mode: data.current_mode || 'medium',
        score: data.current_score || 0,
        band: data.current_band || 'cold',
        lastInteractionAt: data.last_interaction_at,
      };
    } catch (error) {
      console.error('[WarmthManager] Error fetching contact mode:', error);
      return null;
    }
  }

  /**
   * Switch contact's warmth mode
   */
  async switchMode(
    contactId: string,
    newMode: WarmthMode
  ): Promise<{
    modeBefore: WarmthMode;
    modeAfter: WarmthMode;
    scoreBefore: number;
    scoreAfter: number;
    bandAfter: WarmthBand;
  } | null> {
    try {
      const response = await apiFetch(`/api/v1/contacts/${contactId}/warmth/mode`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify({ mode: newMode }),
      });

      if (!response.ok) {
        console.error('[WarmthManager] Mode switch failed:', response.status);
        return null;
      }

      const data = await response.json();

      // Invalidate cache for this contact
      this.cache.delete(contactId);

      return {
        modeBefore: data.mode_before,
        modeAfter: data.mode_after,
        scoreBefore: data.score_before,
        scoreAfter: data.score_after,
        bandAfter: data.band_after,
      };
    } catch (error) {
      console.error('[WarmthManager] Error switching mode:', error);
      return null;
    }
  }

  /**
   * Manually set warmth score in cache
   * Useful for optimistic updates
   */
  setCachedWarmth(contactId: string, score: number, band: WarmthBand) {
    this.cache.set(contactId, {
      score,
      band,
      fetchedAt: Date.now(),
    });
  }

  /**
   * Get cached warmth without fetching
   */
  getCachedWarmth(contactId: string): WarmthScore | null {
    return this.cache.get(contactId) || null;
  }

  /**
   * Invalidate cache for specific contact(s)
   */
  invalidateCache(contactIds?: string[]) {
    if (contactIds) {
      contactIds.forEach(id => this.cache.delete(id));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size,
    };
  }
}

// Singleton instance
let warmthManagerInstance: WarmthManager | null = null;

export function getWarmthManager(): WarmthManager {
  if (!warmthManagerInstance) {
    warmthManagerInstance = new WarmthManager();
  }
  return warmthManagerInstance;
}

// Helper functions for warmth calculations

/**
 * Calculate warmth band from score
 */
export function getWarmthBand(score: number): WarmthBand {
  if (score >= 80) return 'hot';
  if (score >= 60) return 'warm';
  if (score >= 40) return 'neutral';
  if (score >= 20) return 'cool';
  return 'cold';
}

/**
 * Get color for warmth band
 */
export function getWarmthColor(band: WarmthBand): string {
  switch (band) {
    case 'hot':
      return '#EF4444'; // Red
    case 'warm':
      return '#F59E0B'; // Orange
    case 'neutral':
      return '#10B981'; // Green
    case 'cool':
      return '#3B82F6'; // Blue
    case 'cold':
      return '#6B7280'; // Gray
  }
}

/**
 * Get label for warmth band
 */
export function getWarmthLabel(band: WarmthBand): string {
  switch (band) {
    case 'hot':
      return 'Hot';
    case 'warm':
      return 'Warm';
    case 'neutral':
      return 'Neutral';
    case 'cool':
      return 'Cool';
    case 'cold':
      return 'Cold';
  }
}

/**
 * Calculate days until contact needs attention
 * Based on warmth mode and current score
 */
export function getDaysUntilAttention(
  currentScore: number,
  mode: WarmthMode = 'medium'
): number {
  const LAMBDA: Record<WarmthMode, number> = {
    slow: 0.040132,
    medium: 0.085998,
    fast: 0.171996,
    test: 2.407946,
  };

  const ATTENTION_THRESHOLD = 30;

  if (currentScore <= ATTENTION_THRESHOLD) {
    return 0; // Needs attention now
  }

  const lambda = LAMBDA[mode];
  const days = Math.log(currentScore / ATTENTION_THRESHOLD) / lambda;

  return Math.max(0, Math.round(days));
}
