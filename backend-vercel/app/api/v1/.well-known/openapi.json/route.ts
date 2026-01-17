import { options, ok } from "@/lib/cors";
import openapi from "@/openapi/openapi.json";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/.well-known/openapi.json
export async function GET(req: Request){
  return ok(openapi, req);
}
