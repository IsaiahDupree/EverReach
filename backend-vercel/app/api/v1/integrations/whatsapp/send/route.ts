/**
 * WhatsApp Business API - Send Message
 * POST /api/v1/integrations/whatsapp/send
 * 
 * Sends messages via WhatsApp Business API
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0';
const WHATSAPP_PHONE_NUMBER_ID = '851190418074116';

function getWhatsAppToken() {
  return process.env.WHATSAPP_ACCESS_TOKEN;
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = getWhatsAppToken();
    if (!token) {
      return NextResponse.json(
        { error: 'WhatsApp API token not configured' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { to, type = 'template', template } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'Recipient phone number is required' },
        { status: 400 }
      );
    }

    // Prepare WhatsApp message payload
    const payload: any = {
      messaging_product: 'whatsapp',
      to,
      type,
    };

    if (type === 'template') {
      payload.template = template || {
        name: 'hello_world',
        language: { code: 'en_US' },
      };
    } else if (type === 'text') {
      payload.text = { body: body.message };
    }

    // Send message via WhatsApp Business API
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `WhatsApp API error: ${data.error?.message || 'Unknown error'}`
      );
    }

    return NextResponse.json({
      success: true,
      message_id: data.messages?.[0]?.id,
      whatsapp_response: data,
      sent_to: to,
      type,
    });

  } catch (error) {
    console.error('WhatsApp send error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send WhatsApp message',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
