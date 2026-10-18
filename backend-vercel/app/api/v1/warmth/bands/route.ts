/**
 * GET /api/v1/warmth/bands
 * 
 * Returns warmth band thresholds (cold, cool, neutral, warm, hot)
 * For consistent UI rendering across platforms
 * 
 * No auth required - public configuration
 */

import { options, ok } from "@/lib/cors";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function GET(req: Request) {
  try {
    const supabase = getClientOrThrow(req);

    // Use database function for band definitions
    const { data, error } = await supabase.rpc('get_warmth_bands');

    if (error) {
      console.error('[Warmth Bands] Error:', error);
      // Fallback to hardcoded values if RPC fails
      return ok({
        bands: [
          { band: 'hot', min_score: 80, max_score: 100, color: '#EF4444', label: 'Hot' },
          { band: 'warm', min_score: 60, max_score: 79, color: '#F59E0B', label: 'Warm' },
          { band: 'neutral', min_score: 40, max_score: 59, color: '#10B981', label: 'Neutral' },
          { band: 'cool', min_score: 20, max_score: 39, color: '#3B82F6', label: 'Cool' },
          { band: 'cold', min_score: 0, max_score: 19, color: '#6B7280', label: 'Cold' },
        ],
      }, req);
    }

    return ok({
      bands: data || [],
    }, req);

  } catch (e: any) {
    // Return fallback even on error
    return ok({
      bands: [
        { band: 'hot', min_score: 80, max_score: 100, color: '#EF4444', label: 'Hot' },
        { band: 'warm', min_score: 60, max_score: 79, color: '#F59E0B', label: 'Warm' },
        { band: 'neutral', min_score: 40, max_score: 59, color: '#10B981', label: 'Neutral' },
        { band: 'cool', min_score: 20, max_score: 39, color: '#3B82F6', label: 'Cool' },
        { band: 'cold', min_score: 0, max_score: 19, color: '#6B7280', label: 'Cold' },
      ],
    }, req);
  }
}
