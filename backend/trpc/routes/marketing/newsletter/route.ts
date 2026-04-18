// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/trpc/routes/marketing/newsletter/route.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/server';
import { supabaseAdmin } from '@/backend/lib/supabase';

type LeadTrack = 'builders' | 'buyers' | 'curious' | 'clients';

interface LeadTrackDefinition {
  name: string;
  description: string;
  behavior_signals: string[];
  email_count: number;
  email_frequency_days: number;
}

const LEAD_TRACK_CONFIG: Record<LeadTrack, LeadTrackDefinition> = {
  builders: {
    name: 'Builders',
    description: 'Actively building, high engagement with contacts feature',
    behavior_signals: ['high_contact_additions', 'frequent_app_opens', 'message_generation'],
    email_count: 3,
    email_frequency_days: 7
  },
  buyers: {
    name: 'Buyers',
    description: 'Quick converters, interested in immediate value',
    behavior_signals: ['paywall_views', 'quick_signup_to_trial', 'frequent_feature_exploration'],
    email_count: 3,
    email_frequency_days: 5
  },
  curious: {
    name: 'Curious',
    description: 'Exploring, not yet committed to regular use',
    behavior_signals: ['low_contact_adds', 'occasional_app_opens', 'feature_browser'],
    email_count: 4,
    email_frequency_days: 14
  },
  clients: {
    name: 'Clients',
    description: 'Active, paying users - relationship maintenance',
    behavior_signals: ['active_subscriber', 'regular_app_usage', 'relationship_goals_set'],
    email_count: 1,
    email_frequency_days: 7
  }
};

const DRIP_TEMPLATES: Record<LeadTrack, Record<number, {
  subject: string;
  preview: string;
}>> = {
  builders: {
    1: {
      subject: '🚀 3 ways to deepen relationships faster with EverReach',
      preview: 'Build deeper relationships with our warmth scoring system...'
    },
    2: {
      subject: 'Meet your warmth dashboard: See relationships at a glance',
      preview: 'Understand the health of every relationship with one view...'
    },
    3: {
      subject: 'How $2K/mo SaaS founders maintain 50+ key relationships',
      preview: 'Real stories from our most active users...'
    }
  },
  buyers: {
    1: {
      subject: 'Your free trial is ready: Start tracking relationships today',
      preview: 'Import your contacts and let AI do the heavy lifting...'
    },
    2: {
      subject: 'Stop forgetting to reach out (this one trick helps)',
      preview: 'Let EverReach remind you who\'s drifting...'
    },
    3: {
      subject: 'Convert trial to pro: $7.99/mo for unlimited relationships',
      preview: 'Lock in your relationships before the trial ends...'
    }
  },
  curious: {
    1: {
      subject: 'Why people forget to reach out (and how to fix it)',
      preview: 'The friendship fade is real. Here\'s how EverReach prevents it...'
    },
    2: {
      subject: 'See your "drifting" relationships in 2 minutes',
      preview: 'Take the 2-minute walkthrough to find who you\'re losing touch with...'
    },
    3: {
      subject: 'Your relationships are like plants: They need watering',
      preview: 'EverReach is your relationship gardener. Here\'s how...'
    },
    4: {
      subject: 'Ready to get serious about your relationships?',
      preview: 'Start your free trial and import your contacts...'
    }
  },
  clients: {
    1: {
      subject: 'Weekly relationship health: Your drifting contacts + warmth changes',
      preview: 'Here\'s what changed in your relationships this week...'
    }
  }
};

async function assignLeadTrack(userId: string, signals: {
  paywall_views?: boolean;
  contacts_added?: number;
  app_opens?: number;
  is_subscriber?: boolean;
  utm_source?: string;
}): Promise<LeadTrack> {
  let score: Record<LeadTrack, number> = {
    builders: 0,
    buyers: 0,
    curious: 0,
    clients: 0
  };

  // Scoring logic based on signals
  if (signals.is_subscriber) {
    score.clients += 100;
  }

  if (signals.paywall_views) {
    score.buyers += 50;
  }

  if (signals.contacts_added && signals.contacts_added > 10) {
    score.builders += 60;
  } else if (signals.contacts_added && signals.contacts_added > 0) {
    score.curious += 30;
  }

  if (signals.app_opens && signals.app_opens > 5) {
    score.builders += 40;
  } else if (signals.app_opens && signals.app_opens > 0) {
    score.curious += 20;
  }

  // Default from UTM source if available
  if (signals.utm_source?.includes('awareness')) {
    score.curious += 20;
  }

  // Find highest scored track
  const sortedTracks = (Object.entries(score) as [LeadTrack, number][])
    .sort(([, a], [, b]) => b - a);

  return sortedTracks[0][0];
}

export const assignLeadTrackProcedure = publicProcedure
  .input(
    z.object({
      paywall_views: z.boolean().default(false),
      contacts_added: z.number().int().min(0).default(0),
      app_opens: z.number().int().min(0).default(0),
      is_subscriber: z.boolean().default(false),
      utm_source: z.string().optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      console.log('🎯 Assigning lead track for user:', userId);

      // Determine lead track
      const track = await assignLeadTrack(userId, input);

      // Save track assignment
      const { data, error } = await supabaseAdmin
        .from('user_lead_tracks')
        .insert({
          user_id: userId,
          lead_track: track,
          track_signals: {
            paywall_views: input.paywall_views,
            contacts_added: input.contacts_added,
            app_opens: input.app_opens,
            is_subscriber: input.is_subscriber
          },
          utm_source: input.utm_source || null
        })
        .select()
        .single();

      if (error) throw error;

      // Queue drip emails for this track
      const config = LEAD_TRACK_CONFIG[track];
      let nextScheduledTime = new Date();

      for (let step = 1; step <= config.email_count; step++) {
        const template = DRIP_TEMPLATES[track][step];

        const { error: queueError } = await supabaseAdmin
          .from('email_drip_queue')
          .insert({
            user_id: userId,
            lead_track: track,
            step_number: step,
            subject: template.subject,
            body: template.preview,
            scheduled_for: nextScheduledTime.toISOString()
          });

        if (queueError) {
          console.error('Error queuing drip email:', queueError);
        }

        // Schedule next email
        nextScheduledTime.setDate(nextScheduledTime.getDate() + config.email_frequency_days);
      }

      console.log('✅ Assigned track:', track, 'with', config.email_count, 'emails queued');

      return {
        success: true,
        track,
        track_name: config.name,
        emails_queued: config.email_count,
        assignment: data
      };
    } catch (error: any) {
      console.error('❌ Lead track assignment failed:', error);
      throw new Error(`Lead track assignment failed: ${error.message}`);
    }
  });

export const getEmailDripStatusProcedure = publicProcedure
  .query(async ({ ctx }) => {
    try {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get user's current track
      const { data: trackData, error: trackError } = await supabaseAdmin
        .from('user_lead_tracks')
        .select('*')
        .eq('user_id', userId)
        .order('track_assigned_at', { ascending: false })
        .limit(1)
        .single();

      if (trackError && trackError.code !== 'PGRST116') throw trackError;

      // Get queued and sent emails
      const { data: emails, error: emailError } = await supabaseAdmin
        .from('email_drip_queue')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (emailError) throw emailError;

      const scheduled = emails?.filter(e => e.status === 'scheduled').length || 0;
      const sent = emails?.filter(e => e.status === 'sent').length || 0;
      const failed = emails?.filter(e => e.status === 'failed').length || 0;

      return {
        current_track: trackData?.lead_track || null,
        track_assigned_at: trackData?.track_assigned_at || null,
        emails: {
          scheduled,
          sent,
          failed,
          total: emails?.length || 0
        },
        next_email: emails?.find(e => e.status === 'scheduled')
      };
    } catch (error: any) {
      console.error('❌ Failed to get drip status:', error);
      throw new Error(`Failed to get drip status: ${error.message}`);
    }
  });

export const generateWeeklyDigestProcedure = publicProcedure
  .input(
    z.object({
      user_id: z.string().uuid(),
      drifting_contacts: z.array(
        z.object({
          contact_name: z.string(),
          days_since_contact: z.number(),
          warmth_score: z.number()
        })
      ),
      warmth_score_changes: z.object({
        increased: z.number().default(0),
        decreased: z.number().default(0),
        stable: z.number().default(0)
      }),
      suggested_messages_count: z.number().default(0)
    })
  )
  .mutation(async ({ input }) => {
    try {
      console.log('📧 Generating weekly digest for user:', input.user_id);

      // Save summary for analytics
      const { data, error } = await supabaseAdmin
        .from('relationship_health_summary')
        .insert({
          user_id: input.user_id,
          summary_date: new Date().toISOString().split('T')[0],
          drifting_contacts: input.drifting_contacts.length,
          warmth_score_change: input.warmth_score_changes.increased - input.warmth_score_changes.decreased,
          suggested_messages_count: input.suggested_messages_count,
          key_interactions: {
            drifting: input.drifting_contacts,
            warmth_changes: input.warmth_score_changes
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Construct email body
      const emailSubject = `📊 Your Weekly Relationship Health: ${input.drifting_contacts.length} contacts drifting`;
      const topDrifting = input.drifting_contacts.slice(0, 3);

      const emailBody = `
Hi there,

Here's what's happening in your relationships this week:

**Drifting Contacts (${input.drifting_contacts.length})**
${topDrifting.map(c => `• ${c.contact_name} — ${c.days_since_contact} days since you talked`).join('\n')}

**Warmth Score Changes**
📈 ${input.warmth_score_changes.increased} relationships got closer
📉 ${input.warmth_score_changes.decreased} relationships cooled
= ${input.warmth_score_changes.stable} stable

**Suggested Messages Ready**
${input.suggested_messages_count} pre-written messages ready to send!

Time to reconnect? Here's a quick action: Pick one drifting contact and send a message right now.

Best,
EverReach Team
`;

      // Queue digest email
      const { error: queueError } = await supabaseAdmin
        .from('email_drip_queue')
        .insert({
          user_id: input.user_id,
          lead_track: 'clients',
          step_number: 0,
          subject: emailSubject,
          body: emailBody,
          scheduled_for: new Date().toISOString(),
          status: 'scheduled'
        });

      if (queueError) throw queueError;

      console.log('✅ Weekly digest queued for user:', input.user_id);

      return {
        success: true,
        digest: data,
        email_queued: true
      };
    } catch (error: any) {
      console.error('❌ Failed to generate weekly digest:', error);
      throw new Error(`Digest generation failed: ${error.message}`);
    }
  });
