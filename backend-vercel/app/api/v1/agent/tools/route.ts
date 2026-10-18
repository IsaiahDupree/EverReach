import { options, ok, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { AGENT_TOOLS } from "@/lib/openai";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  // Return available function tools with metadata (narrow type first)
  const tools = (AGENT_TOOLS as any[])
    .filter(t => (t as any).type === 'function')
    .map(t => {
      const fn = (t as any).function || {};
      return {
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters
      };
    });

  return ok({
    tools,
    count: tools.length,
    categories: {
      contacts: ['get_contact', 'search_contacts', 'update_contact'],
      interactions: ['get_contact_interactions'],
      persona: ['get_persona_notes', 'process_voice_note'],
      composition: ['compose_message', 'get_message_goals'],
      analysis: ['analyze_contact']
    }
  }, req);
}
