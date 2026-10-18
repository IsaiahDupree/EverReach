import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { getOpenAIClient, DEFAULT_MODEL, SYSTEM_PROMPTS } from "@/lib/openai";
import { z } from "zod";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

const processSchema = z.object({
  note_id: z.string().uuid(),
  extract_contacts: z.boolean().default(true),
  extract_actions: z.boolean().default(true),
  categorize: z.boolean().default(true),
  suggest_tags: z.boolean().default(true)
});

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    const parsed = processSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.message, req);

    const { note_id, extract_contacts, extract_actions, categorize, suggest_tags } = parsed.data;

    const supabase = getClientOrThrow(req);

    // Get the voice note
    const { data: note, error: noteError } = await supabase
      .from('persona_notes')
      .select('*')
      .eq('id', note_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (noteError || !note) {
      return new Response(JSON.stringify({ error: "Note not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    const content = note.transcript || note.body_text || '';
    if (!content) {
      return new Response(JSON.stringify({ error: "Note has no content" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Build processing prompt
    const tasks = [];
    if (extract_contacts) tasks.push('- People/contact names mentioned');
    if (extract_actions) tasks.push('- Action items and to-dos');
    if (categorize) tasks.push('- Category (personal/networking/business)');
    if (suggest_tags) tasks.push('- Relevant tags (3-5 keywords)');

    const prompt = `Analyze this voice note and extract:\n${tasks.join('\n')}\n- Sentiment (positive/neutral/negative)\n- Key topics\n\nVoice Note:\n"${content}"\n\nRespond with valid JSON only. Use these fields: contacts (array), actions (array), category (string), tags (array), sentiment (string), topics (array).`;

    // Process with OpenAI
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.transcriber },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const extracted = JSON.parse(response.choices[0]?.message?.content || '{}');

    // Try to match extracted contacts with existing contacts
    const contactMatches: any[] = [];
    if (extracted.contacts && Array.isArray(extracted.contacts)) {
      for (const contactName of extracted.contacts) {
        const { data: matches } = await supabase
          .from('contacts')
          .select('id, display_name')
          .ilike('display_name', `%${contactName}%`)
          .limit(3);
        
        if (matches && matches.length > 0) {
          contactMatches.push({
            mentioned: contactName,
            possible_matches: matches
          });
        }
      }
    }

    // Update note with processing results
    const updatedMetadata = {
      ...(note.metadata || {}),
      ai_processed: true,
      processing_date: new Date().toISOString(),
      extracted_data: extracted,
      contact_matches: contactMatches,
      processing_options: { extract_contacts, extract_actions, categorize, suggest_tags }
    };

    // Update tags if suggested
    let finalTags = note.tags || [];
    if (suggest_tags && extracted.tags) {
      finalTags = [...new Set([...finalTags, ...extracted.tags])].slice(0, 10);
    }

    await supabase
      .from('persona_notes')
      .update({
        tags: finalTags,
        metadata: updatedMetadata
      })
      .eq('id', note_id);

    return ok({
      note_id,
      processed: true,
      extracted,
      contact_matches: contactMatches,
      tags_added: suggest_tags ? extracted.tags : [],
      usage: response.usage
    }, req);

  } catch (error: any) {
    console.error('[Voice Note Processing Error]', error);
    return serverError("Internal server error", req);
  }
}
