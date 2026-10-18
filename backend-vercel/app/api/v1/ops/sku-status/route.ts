import { options, ok, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

// GET /api/v1/ops/sku-status
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const supabase = getServiceClient();
    const { data: rows, error } = await supabase
      .from('product_skus')
      .select('product_id, store, sku')
      .order('store')
      .order('product_id');

    if (error) throw error;

    const byStore: Record<string, { count: number, items: Array<{ product_id: string, sku: string }> }> = {};
    for (const r of rows || []) {
      const store = (r as any).store as string;
      if (!byStore[store]) byStore[store] = { count: 0, items: [] };
      byStore[store].count += 1;
      byStore[store].items.push({ product_id: (r as any).product_id, sku: (r as any).sku });
    }

    return ok({ total: (rows || []).length, byStore, rows }, req);
  } catch (e: any) {
    return serverError(e?.message || 'sku_status_failed', req);
  }
}
