import { ok, options } from "@/lib/cors";

export const runtime = 'edge';
export async function OPTIONS(){ return options(); }
export async function GET(){
  return ok({ ran: true, task: 'daily-recs', ts: Date.now() });
}
