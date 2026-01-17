import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

// POST /api/v1/ops/send-test-email
// Body: { to?: string, subject?: string, text?: string, html?: string }
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => ({}));
    let to = typeof body.to === 'string' && body.to.includes('@') ? body.to : '';

    if (!to) {
      // Fallback to the user's profile email
      const supabase = getClientOrThrow(req);
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profile?.email) to = profile.email;
    }

    if (!to) return badRequest('Missing recipient email (to) and no email on profile', req);

    const subject = typeof body.subject === 'string' && body.subject.trim() ? body.subject : 'EverReach test email';
    const text = typeof body.text === 'string' && body.text.trim() ? body.text : 'Hello from EverReach.';
    const html = typeof body.html === 'string' && body.html.trim() ? body.html : `<p>Hello from <strong>EverReach</strong>.</p>`;

    const res = await sendEmail({ to, subject, text, html });
    return ok({ sent: true, id: (res as any)?.id || null }, req);
  } catch (e: any) {
    return serverError(e?.message || 'send_email_failed', req);
  }
}
