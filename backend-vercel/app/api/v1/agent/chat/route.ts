import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { getOpenAIClient, DEFAULT_MODEL, SYSTEM_PROMPTS, AGENT_TOOLS } from "@/lib/openai";
import { executeTool } from "@/lib/agent-tools";
import { z } from "zod";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

const chatSchema = z.object({
  message: z.string().min(1),
  conversation_id: z.string().uuid().optional(),
  context: z.object({
    contact_id: z.string().uuid().optional(),
    goal_type: z.enum(['personal', 'networking', 'business']).optional(),
    use_tools: z.boolean().default(true)
  }).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional()
});

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.message, req);

    const { message, conversation_id, context, model = DEFAULT_MODEL, temperature = 0.7 } = parsed.data;

    // Ensure context is properly typed for tool toggling
    type AgentContext = { contact_id?: string; goal_type?: 'personal'|'networking'|'business'; use_tools?: boolean };
    const ctx: AgentContext = (context ?? {}) as AgentContext;
    const useTools = ctx.use_tools !== false;

    const supabase = getClientOrThrow(req);
    const client = getOpenAIClient();

    // Load conversation history if continuing
    let messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPTS.assistant }
    ];

    if (conversation_id) {
      const { data: conv } = await supabase
        .from('agent_conversations')
        .select('messages')
        .eq('id', conversation_id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (conv) {
        const history = JSON.parse(conv.messages || '[]');
        messages = [...messages, ...history];
      }
    }

    // If a contact_id was provided, add a system instruction so the model uses tools
    if (ctx.contact_id) {
      messages.push({
        role: 'system',
        content: `Context: contact_id=${ctx.contact_id}. If tools are available, use them to retrieve this contact's details and recent interactions, then answer the user's request. Do NOT ask the user for the contact ID.`
      });
    }

    // Add user message
    messages.push({ role: 'user', content: message });

    // Make API call with optional function calling
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: 800,
      tools: useTools ? AGENT_TOOLS : undefined,
      tool_choice: useTools ? 'auto' : undefined
    });

    let responseMessage = completion.choices[0]?.message as any;
    const toolCalls = (responseMessage?.tool_calls as any[]) || [];

    // Handle function/tool calls
    const toolResults: any[] = [];
    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const fn = (toolCall as any).function || {};
        const functionName = String(fn.name || '');
        const rawArgs = typeof fn.arguments === 'string' ? fn.arguments : '{}';
        const functionArgs = JSON.parse(rawArgs || '{}');

        console.log(`[Agent] Executing tool: ${functionName}`, functionArgs);

        const result = await executeTool(functionName, functionArgs, {
          supabase,
          userId: user.id
        });

        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: JSON.stringify(result)
        });
      }

      // Make second API call with tool results
      messages.push(responseMessage);
      messages.push(...toolResults);

      const secondCompletion = await client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: 800
      });

      responseMessage = secondCompletion.choices[0]?.message;
    }

    // Save conversation
    const updatedMessages = [
      ...messages.filter(m => m.role !== 'system'),
      { role: 'assistant', content: responseMessage?.content || '', timestamp: new Date().toISOString() }
    ];

    const conversationId = conversation_id || crypto.randomUUID();
    await supabase
      .from('agent_conversations')
      .upsert({
        id: conversationId,
        user_id: user.id,
        messages: JSON.stringify(updatedMessages),
        context: JSON.stringify(context),
        updated_at: new Date().toISOString()
      });

    return ok({
      conversation_id: conversationId,
      message: responseMessage?.content || '',
      tool_calls_made: toolResults.length,
      tools_used: toolResults.map(t => t.name),
      usage: completion.usage
    }, req);

  } catch (error: any) {
    console.error('[Agent Chat Error]', error);
    return serverError("Internal server error", req);
  }
}
