import { ok, badRequest, serverError, unauthorized, options } from '../../../../../lib/cors';
import { openai } from '../../../../../lib/openai';
import { getUser } from '../../../../../lib/auth';
import { getClientOrThrow } from '../../../../../lib/supabase';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

type AgentChatRequest = {
  message: string;
  conversation_id?: string;
  context?: {
    contact_id?: string;
    goal_type?: 'personal' | 'networking' | 'business';
    use_tools?: boolean;
  };
  model?: string;
  temperature?: number;
};

async function getContactContext(contactId: string, req: Request) {
  const supabase = getClientOrThrow(req);
  
  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (!contact) return null;

  const { data: interactions } = await supabase
    .from('interactions')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: notes } = await supabase
    .from('persona_notes')
    .select('*')
    .eq('person_id', contactId)
    .order('created_at', { ascending: false })
    .limit(3);

  return {
    contact,
    interactions: interactions || [],
    notes: notes || [],
    references: {
      contacts: [{ id: contact.id, name: contact.display_name }],
      interactions: (interactions || []).map((i: any) => ({ id: i.id, date: i.created_at })),
      notes: (notes || []).map((n: any) => ({ id: n.id, type: 'voice' as const })),
    }
  };
}

async function getAllContactsContext(req: Request) {
  const supabase = getClientOrThrow(req);
  
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, display_name, emails, phones, company, title, tags, warmth, last_interaction')
    .order('warmth', { ascending: false })
    .limit(50);

  return {
    contacts: contacts || [],
    references: {
      contacts: (contacts || []).map((c: any) => ({ id: c.id, name: c.display_name })),
      data_sources: ['contacts_database']
    }
  };
}

export async function POST(req: Request) {
  try {
    const user = await getUser(req);
    if (!user) {
      return unauthorized('Authentication required', req);
    }

    const body: AgentChatRequest = await req.json();
    
    if (!body.message?.trim()) {
      return badRequest('Message is required', req);
    }

    const model = body.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const temperature = body.temperature ?? 0.7;

    let systemPrompt = `You are a helpful personal CRM assistant for EverReach. You help users manage their contacts, relationships, and networking activities.

You can:
- Answer questions about contacts
- Provide relationship insights
- Suggest follow-up actions
- Help compose messages
- Analyze interaction patterns

Be concise, helpful, and reference specific contact details when relevant.`;

    const contextParts: string[] = [];
    let references: any = {};

    if (body.context?.contact_id) {
      const contactContext = await getContactContext(body.context.contact_id, req);
      if (contactContext) {
        references = contactContext.references;
        contextParts.push(`CONTACT CONTEXT:
Name: ${contactContext.contact.display_name}
Company: ${contactContext.contact.company || 'N/A'}
Title: ${contactContext.contact.title || 'N/A'}
Warmth Score: ${contactContext.contact.warmth || 'Unknown'}
Last Interaction: ${contactContext.contact.last_interaction || 'No recent interaction'}

Recent Interactions (${contactContext.interactions.length}):
${contactContext.interactions.map((i: any) => `- ${i.created_at}: ${i.summary || 'No summary'}`).join('\n')}

Voice Notes (${contactContext.notes.length}):
${contactContext.notes.map((n: any) => `- ${n.created_at}: ${n.transcription?.substring(0, 100) || 'No transcription'}`).join('\n')}`);
      }
    } else {
      const contactsData = await getAllContactsContext(req);
      references = contactsData.references;
      contextParts.push(`USER'S CONTACTS (${contactsData.contacts.length} total, showing top 50 by warmth):
${contactsData.contacts.map((c: any) => `• ${c.display_name}${c.company ? ` (${c.company})` : ''}${c.title ? ` - ${c.title}` : ''}
  Warmth: ${c.warmth || 'Unknown'}
  Last interaction: ${c.last_interaction || 'No recent interaction'}
  Contact: ${c.emails?.[0] || c.phones?.[0] || 'No contact info'}`).join('\n\n')}`);
    }

    if (contextParts.length > 0) {
      systemPrompt += '\n\n' + contextParts.join('\n\n');
    }

    const client = openai();
    const completion = await client.chat.completions.create({
      model,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: body.message }
      ],
      max_tokens: 1000
    });

    const responseMessage = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

    return ok({
      conversation_id: body.conversation_id || crypto.randomUUID(),
      message: responseMessage,
      tool_calls_made: 0,
      tools_used: [],
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0
      },
      references
    }, req);

  } catch (err: any) {
    console.error('Agent chat error:', err);
    return serverError(err?.message || 'Internal error', req);
  }
}
