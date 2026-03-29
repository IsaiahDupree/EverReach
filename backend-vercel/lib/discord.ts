// Discord Incoming Webhook sender
// Docs: https://discord.com/developers/docs/resources/webhook#execute-webhook

export interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number; // decimal color int
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string; // ISO 8601
}

/**
 * Send a message to a Discord channel via Incoming Webhook.
 * Uses DISCORD_WEBHOOK_URL from env.
 */
export async function sendDiscordMessage(
  payload: DiscordWebhookPayload
): Promise<{ ok: boolean; status: number; error?: string }> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl || webhookUrl.includes('YOUR_WEBHOOK')) {
    console.warn('[discord] DISCORD_WEBHOOK_URL is not configured');
    return { ok: false, status: 0, error: 'DISCORD_WEBHOOK_URL not configured' };
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[discord] Webhook failed:', res.status, text);
    return { ok: false, status: res.status, error: text };
  }

  return { ok: true, status: res.status };
}

/**
 * Send a plain text message to the configured Discord channel.
 */
export async function sendDiscordText(
  text: string,
  username?: string
): Promise<{ ok: boolean; status: number; error?: string }> {
  return sendDiscordMessage({ content: text, username });
}
