/**
 * Facebook Messenger & Instagram DMs - Send Message
 * POST /api/v1/integrations/messenger/send
 * 
 * Sends messages via Messenger or Instagram DMs
 * Uses the same Page endpoint for both platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth-utils';

const FB_GRAPH_API = 'https://graph.facebook.com/v24.0';

function getSupabase() { return getServiceClient(); }

function getPageToken(platform: 'messenger' | 'instagram') {
  // Get from meta_platform_config or environment
  return platform === 'messenger' 
    ? process.env.MESSENGER_PAGE_TOKEN
    : process.env.INSTAGRAM_PAGE_TOKEN;
}

function getPageId(platform: 'messenger' | 'instagram') {
  return platform === 'messenger'
    ? process.env.MESSENGER_PAGE_ID
    : process.env.INSTAGRAM_PAGE_ID;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      platform = 'messenger', // 'messenger' or 'instagram'
      recipient_id, // PSID
      message_type = 'text',
      text,
      image_url,
      template,
      quick_replies,
      thread_id, // Optional: link to existing thread
    } = body;

    if (!recipient_id) {
      return NextResponse.json(
        { error: 'recipient_id is required' },
        { status: 400 }
      );
    }

    const pageToken = getPageToken(platform);
    const pageId = getPageId(platform);

    if (!pageToken || !pageId) {
      return NextResponse.json(
        { error: `${platform} Page token/ID not configured` },
        { status: 500 }
      );
    }

    // Check if we're in valid messaging window
    let canSend = true;
    let needsTag = false;
    
    if (thread_id) {
      const { data: isValid } = await supabase
        .rpc('is_in_messaging_window', { p_thread_id: thread_id });
      
      canSend = isValid;
      needsTag = !isValid;
    }

    if (!canSend && !needsTag) {
      return NextResponse.json(
        {
          error: 'Outside 24-hour messaging window. Use message tags or templates.',
          can_use_tags: true,
        },
        { status: 403 }
      );
    }

    // Build message payload
    const messagePayload: any = {
      recipient: { id: recipient_id },
      message: {},
    };

    if (message_type === 'text' && text) {
      messagePayload.message.text = text;
      if (quick_replies) {
        messagePayload.message.quick_replies = quick_replies;
      }
    } else if (message_type === 'image' && image_url) {
      messagePayload.message.attachment = {
        type: 'image',
        payload: { url: image_url, is_reusable: true },
      };
    } else if (message_type === 'template' && template) {
      messagePayload.message.attachment = {
        type: 'template',
        payload: template,
      };
    }

    // Add messaging tag if outside window (for supported cases)
    if (needsTag) {
      messagePayload.messaging_type = 'MESSAGE_TAG';
      messagePayload.tag = 'HUMAN_AGENT'; // 7-day extension for manual replies
    }

    // Send via Meta API
    const response = await fetch(
      `${FB_GRAPH_API}/${pageId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...messagePayload,
          access_token: pageToken,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `${platform} API error: ${data.error?.message || 'Unknown error'}`
      );
    }

    // Find or create thread
    let threadIdToUse = thread_id;
    
    if (!threadIdToUse) {
      const { data: existingThread } = await supabase
        .from('conversation_thread')
        .select('thread_id')
        .eq('platform', platform)
        .eq('platform_thread_id', recipient_id)
        .single();
      
      if (existingThread) {
        threadIdToUse = existingThread.thread_id;
      } else {
        const { data: newThread } = await supabase
          .from('conversation_thread')
          .insert({
            user_id: auth.userId,
            platform,
            platform_thread_id: recipient_id,
            page_id: pageId,
            status: 'active',
          })
          .select('thread_id')
          .single();
        
        threadIdToUse = newThread?.thread_id;
      }
    }

    // Store message in database
    if (threadIdToUse) {
      await supabase
        .from('conversation_message')
        .insert({
          thread_id: threadIdToUse,
          platform_message_id: data.message_id,
          direction: 'outbound',
          message_type,
          content: text,
          media_url: image_url,
          status: 'sent',
          metadata: {
            platform,
            recipient_id,
            used_tag: needsTag,
          },
        });
    }

    return NextResponse.json({
      success: true,
      message_id: data.message_id,
      recipient_id: data.recipient_id,
      platform,
      thread_id: threadIdToUse,
      used_message_tag: needsTag,
    });

  } catch (error) {
    console.error('Messenger/IG send error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send message',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
