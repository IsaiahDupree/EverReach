import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Cron Job: Daily Warmth Snapshots
 * Schedule: 0 0 * * * (midnight UTC daily)
 * 
 * Records daily warmth score snapshots for all contacts.
 * This ensures we have historical data even if warmth scores
 * aren't actively being updated via the trigger.
 * 
 * Strategy:
 * 1. Fetch all contacts with warmth scores
 * 2. Record snapshot for each contact (upserts if already exists today)
 * 3. Return summary of snapshots created
 */
export async function GET(req: Request) {
  try {
    // Verify cron secret (Vercel sets this automatically)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Initialize Supabase client (service role for cron jobs)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Fetch all contacts with warmth scores
    const { data: contacts, error: fetchError } = await supabase
      .from('contacts')
      .select('id, warmth, warmth_band')
      .not('warmth', 'is', null)
      .order('id');

    if (fetchError) {
      throw new Error(`Failed to fetch contacts: ${fetchError.message}`);
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No contacts to snapshot',
        snapshots_created: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Record snapshots using the helper function
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const contact of contacts) {
      try {
        // Call the record_warmth_snapshot function
        const { error: snapshotError } = await supabase.rpc('record_warmth_snapshot', {
          p_contact_id: contact.id,
          p_score: contact.warmth || 0,
          p_band: contact.warmth_band || 'cold'
        });

        if (snapshotError) {
          errorCount++;
          errors.push(`Contact ${contact.id}: ${snapshotError.message}`);
        } else {
          successCount++;
        }
      } catch (err: any) {
        errorCount++;
        errors.push(`Contact ${contact.id}: ${err.message}`);
      }
    }

    // Return summary
    const response = {
      success: true,
      message: `Warmth snapshots completed`,
      total_contacts: contacts.length,
      snapshots_created: successCount,
      errors: errorCount,
      error_details: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit to first 10 errors
      timestamp: new Date().toISOString()
    };

    // Log summary
    console.log('[CRON] Warmth Snapshots:', JSON.stringify(response));

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[CRON] Warmth snapshots failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
