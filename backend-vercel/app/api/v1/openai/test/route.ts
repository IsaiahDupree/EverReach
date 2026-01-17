import { options, ok, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getOpenAIClient, DEFAULT_MODEL } from "@/lib/openai";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body optional for test
    }

    const { prompt = "Say 'Hello from OpenAI!'", model = DEFAULT_MODEL, max_tokens = 150, temperature = 0.7 } = body;

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "not_configured",
          message: "OPENAI_API_KEY not configured in environment variables"
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = getOpenAIClient();
    
    // Test completion
    const start = Date.now();
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens,
      temperature
    });
    const latency = Date.now() - start;

    const result = {
      status: "success",
      model: response.model,
      response: response.choices[0]?.message?.content || "",
      usage: response.usage,
      latency_ms: latency,
      timestamp: new Date().toISOString()
    };

    return ok(result, req);
  } catch (error: any) {
    console.error('[OpenAI Test Error]', error);
    return serverError(error.message || "OpenAI test failed", req);
  }
}

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const configured = !!process.env.OPENAI_API_KEY;
  
  return ok({
    configured,
    model: DEFAULT_MODEL,
    message: configured ? "OpenAI is configured and ready" : "OPENAI_API_KEY not configured"
  }, req);
}
