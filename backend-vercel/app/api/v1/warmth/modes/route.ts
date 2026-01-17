import { options, ok } from "@/lib/cors";
import { getWarmthModeInfo, type WarmthMode } from "@/lib/warmth-ewma";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/warmth/modes - Get all available warmth modes with metadata
export async function GET(req: Request){
  const modes: WarmthMode[] = ['slow', 'medium', 'fast', 'test'];

  const modesInfo = modes.map(mode => getWarmthModeInfo(mode));

  return ok({
    modes: modesInfo,
    default: 'medium',
    description: 'Warmth score decay modes. Controls how quickly relationships cool down without interaction.',
  }, req);
}
