import { options, unauthorized, badRequest } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { getOpenAIClient, DEFAULT_MODEL, SYSTEM_PROMPTS } from "@/lib/openai";
import { z } from "zod";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

const streamSchema = z.object({
  message: z.string().min(1),
  conversation_id: z.string().uuid().optional(),
  context: z.object({
    contact_id: z.string().uuid().optional(),
    goal_type: z.enum(['personal', 'networking', 'business']).optional()
  }).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional()
});

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const body = await req.json();
    const parsed = streamSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.message, req);
    }

    const { message, conversation_id, context = {}, model = DEFAULT_MODEL, temperature = 0.7 } = parsed.data;

    const supabase = getClientOrThrow(req);
    const client = getOpenAIClient();

    // Load conversation history
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

    // Add user message
    messages.push({ role: 'user', content: message });

    // Create streaming completion
    const stream = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: 800,
      stream: true
    });

    // Create SSE stream
    const encoder = new TextEncoder();
    let fullResponse = '';
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              
              // Send SSE format
              const data = JSON.stringify({ content, done: false });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // Save conversation
          const updatedMessages = [
            ...messages.filter(m => m.role !== 'system'),
            { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() }
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

          // Send final event with conversation ID
          const finalData = JSON.stringify({ 
            content: '', 
            done: true, 
            conversation_id: conversationId 
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          controller.close();
        } catch (error: any) {
          console.error('[Stream Error]', error);
          const errorData = JSON.stringify({ error: 'Stream processing failed' });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: any) {
    console.error('[Stream Setup Error]', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
