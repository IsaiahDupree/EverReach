import { ok, options } from "@/lib/cors";
import { verifyCron } from "@/lib/cron-auth";

export const runtime = 'nodejs';
export async function OPTIONS(){ return options(); }
export async function GET(req: Request){
  const authError = verifyCron(req);
  if (authError) return authError;
  return ok({ ran: true, task: 'score-leads', ts: Date.now() });
}
