/**
 * Meta Platforms Webhook Handler
 * POST/GET /api/webhooks/meta
 * 
 * Handles webhooks from:
 * - Facebook Messenger
 * - Instagram DMs
 * - WhatsApp Business
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'everreach_meta_verify_2025';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Webhook verification (GET)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verified');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
    }
  } catch (error) {
    console.error('Webhook verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

// Webhook events (POST)
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();

    console.log('📨 Meta webhook received:', JSON.stringify(body, null, 2));

    // Log the raw webhook for debugging/replay
    const { error: logError } = await supabase
      .from('meta_webhook_event')
      .insert({
        platform: detectPlatform(body),
        event_type: detectEventType(body),
        payload: body,
        processed: false,
      });

    if (logError) {
      console.error('Failed to log webhook:', logError);
    }

    // Process each entry
    if (body.object === 'page') {
      // Messenger or Instagram DMs
      for (const entry of body.entry || []) {
        await processPageEntry(supabase, entry);
      }
    } else if (body.object === 'whatsapp_business_account') {
      // WhatsApp
      for (const entry of body.entry || []) {
        await processWhatsAppEntry(supabase, entry);
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 200 to prevent Meta from retrying
    return NextResponse.json({ status: 'error', message: (error as Error).message }, { status: 200 });
  }
}

// Detect platform from webhook body
function detectPlatform(body: any): string {
  if (body.object === 'whatsapp_business_account') return 'whatsapp';
  if (body.entry?.[0]?.messaging?.[0]?.message) {
    // Check if it's Instagram by looking at sender ID format or metadata
    return 'messenger'; // Default to messenger, refine based on your logic
  }
  return 'unknown';
}

// Detect event type
function detectEventType(body: any): string {
  if (body.entry?.[0]?.messaging?.[0]?.message) return 'message';
  if (body.entry?.[0]?.messaging?.[0]?.delivery) return 'delivery';
  if (body.entry?.[0]?.messaging?.[0]?.read) return 'read';
  if (body.entry?.[0]?.messaging?.[0]?.postback) return 'postback';
  if (body.entry?.[0]?.changes?.[0]?.value?.statuses) return 'status';
  return 'unknown';
}

// Process Messenger/Instagram entry
async function processPageEntry(supabase: any, entry: any) {
  const messaging = entry.messaging || [];
  
  for (const event of messaging) {
    if (event.message) {
      await handleInboundMessage(supabase, event, 'messenger');
    } else if (event.delivery) {
      await handleDeliveryEvent(supabase, event);
    } else if (event.read) {
      await handleReadEvent(supabase, event);
    }
  }
}

// Process WhatsApp entry
async function processWhatsAppEntry(supabase: any, entry: any) {
  const changes = entry.changes || [];
  
  for (const change of changes) {
    const value = change.value;
    
    if (value.messages) {
      for (const message of value.messages) {
        await handleInboundMessage(supabase, { 
          sender: { id: message.from },
          message: {
            mid: message.id,
            text: message.text?.body,
            ...message
          }
        }, 'whatsapp');
      }
    }
    
    if (value.statuses) {
      for (const status of value.statuses) {
        await handleWhatsAppStatus(supabase, status);
      }
    }
  }
}

// Handle inbound message
async function handleInboundMessage(supabase: any, event: any, platform: string) {
  const senderId = event.sender.id;
  const message = event.message;
  
  // Find or create thread
  let { data: thread } = await supabase
    .from('conversation_thread')
    .select('*')
    .eq('platform', platform)
    .eq('platform_thread_id', senderId)
    .single();
  
  if (!thread) {
    // Create new thread
    const { data: newThread } = await supabase
      .from('conversation_thread')
      .insert({
        platform,
        platform_thread_id: senderId,
        status: 'active',
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    thread = newThread;
  }
  
  if (!thread) {
    console.error('Failed to create thread');
    return;
  }
  
  // Insert message
  await supabase
    .from('conversation_message')
    .insert({
      thread_id: thread.thread_id,
      platform_message_id: message.mid || message.id,
      direction: 'inbound',
      message_type: message.text ? 'text' : 'other',
      content: message.text,
      metadata: message,
    });
  
  // Open 24-hour policy window
  await supabase
    .from('messaging_policy_window')
    .insert({
      thread_id: thread.thread_id,
      window_type: 'standard_24h',
      opened_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      trigger_event: 'user_message',
      is_active: true,
    });
}

// Handle delivery event
async function handleDeliveryEvent(supabase: any, event: any) {
  const delivery = event.delivery;
  
  for (const mid of delivery.mids || []) {
    const { data: message } = await supabase
      .from('conversation_message')
      .select('message_id')
      .eq('platform_message_id', mid)
      .single();
    
    if (message) {
      await supabase
        .from('conversation_message')
        .update({
          status: 'delivered',
          delivered_at: new Date(delivery.watermark).toISOString(),
        })
        .eq('message_id', message.message_id);
      
      await supabase
        .from('message_delivery_event')
        .insert({
          message_id: message.message_id,
          event_type: 'delivered',
          occurred_at: new Date(delivery.watermark).toISOString(),
        });
    }
  }
}

// Handle read event
async function handleReadEvent(supabase: any, event: any) {
  const read = event.read;
  
  const { data: message } = await supabase
    .from('conversation_message')
    .select('message_id')
    .eq('platform_message_id', read.mid)
    .single();
  
  if (message) {
    await supabase
      .from('conversation_message')
      .update({
        status: 'read',
        read_at: new Date(read.watermark).toISOString(),
      })
      .eq('message_id', message.message_id);
    
    await supabase
      .from('message_delivery_event')
      .insert({
        message_id: message.message_id,
        event_type: 'read',
        occurred_at: new Date(read.watermark).toISOString(),
      });
  }
}

// Handle WhatsApp status updates
async function handleWhatsAppStatus(supabase: any, status: any) {
  const { data: message } = await supabase
    .from('conversation_message')
    .select('message_id')
    .eq('platform_message_id', status.id)
    .single();
  
  if (message) {
    const statusMap: Record<string, string> = {
      'sent': 'sent',
      'delivered': 'delivered',
      'read': 'read',
      'failed': 'failed',
    };
    
    await supabase
      .from('conversation_message')
      .update({
        status: statusMap[status.status] || 'sent',
      })
      .eq('message_id', message.message_id);
    
    await supabase
      .from('message_delivery_event')
      .insert({
        message_id: message.message_id,
        event_type: status.status,
        occurred_at: new Date(status.timestamp * 1000).toISOString(),
        platform_data: status,
      });
  }
}
