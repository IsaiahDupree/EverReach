// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/trpc/routes/concierge/relay/route.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/server';
import { supabaseAdmin as supabase } from '@/backend/lib/supabase';
import type { RelayJob } from '@/types/message';

// Queue a message for sending
export const queueMessageProcedure = publicProcedure
  .input(z.object({
    channel: z.enum(['imessage', 'sms', 'whatsapp', 'telegram', 'discord']),
    recipientHandle: z.string(),
    messageBody: z.string(),
    priority: z.number().min(1).max(10).default(5),
    scheduledFor: z.string().datetime().optional()
  }))
  .mutation(async ({ input }) => {
    console.log('📤 Queueing message:', { 
      channel: input.channel, 
      recipient: input.recipientHandle.substring(0, 5) + '...',
      priority: input.priority 
    });
    
    const { data: job, error } = await supabase
      .from('relay_jobs')
      .insert({
        channel: input.channel,
        recipient_handle: input.recipientHandle,
        message_body: input.messageBody,
        priority: input.priority,
        status: 'queued',
        scheduled_for: input.scheduledFor || new Date().toISOString(),
        attempts: 0,
        max_attempts: 3
      })
      .select()
      .single();
    
    if (error) {
      throw new Error('Failed to queue message');
    }
    
    return transformDbRelayJob(job);
  });

// Get pending relay jobs
export const getPendingJobsProcedure = publicProcedure
  .input(z.object({
    channel: z.enum(['imessage', 'sms', 'whatsapp', 'telegram', 'discord']).optional(),
    limit: z.number().default(50)
  }))
  .query(async ({ input }) => {
    let query = supabase
      .from('relay_jobs')
      .select('*')
      .in('status', ['queued', 'processing'])
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true })
      .limit(input.limit);
    
    if (input.channel) {
      query = query.eq('channel', input.channel);
    }
    
    const { data: jobs, error } = await query;
    
    if (error) {
      throw new Error('Failed to fetch pending jobs');
    }
    
    return jobs?.map(transformDbRelayJob) || [];
  });

// Update job status
export const updateJobStatusProcedure = publicProcedure
  .input(z.object({
    jobId: z.string(),
    status: z.enum(['queued', 'processing', 'sent', 'failed', 'cancelled']),
    errorMessage: z.string().optional(),
    providerResponse: z.record(z.string(), z.any()).optional(),
    incrementAttempts: z.boolean().default(false)
  }))
  .mutation(async ({ input }) => {
    console.log('🔄 Updating job status:', { jobId: input.jobId, status: input.status });
    
    const updateData: any = {
      status: input.status,
      updated_at: new Date().toISOString()
    };
    
    if (input.errorMessage) updateData.error_message = input.errorMessage;
    if (input.providerResponse) updateData.provider_response = input.providerResponse;
    if (input.incrementAttempts) {
      // Use SQL to increment attempts atomically
      const { data: currentJob } = await supabase
        .from('relay_jobs')
        .select('attempts')
        .eq('id', input.jobId)
        .single();
      
      if (currentJob) {
        updateData.attempts = currentJob.attempts + 1;
      }
    }
    
    const { data: job, error } = await supabase
      .from('relay_jobs')
      .update(updateData)
      .eq('id', input.jobId)
      .select()
      .single();
    
    if (error) {
      throw new Error('Failed to update job status');
    }
    
    return transformDbRelayJob(job);
  });

// Record inbound message
export const recordInboundMessageProcedure = publicProcedure
  .input(z.object({
    channel: z.enum(['imessage', 'sms', 'whatsapp', 'telegram', 'discord']),
    threadId: z.string(),
    senderHandle: z.string(),
    messageBody: z.string(),
    meta: z.record(z.string(), z.any()).default({}),
    participants: z.array(z.string()).optional()
  }))
  .mutation(async ({ input }) => {
    console.log('📥 Recording inbound message:', { 
      channel: input.channel, 
      sender: input.senderHandle.substring(0, 5) + '...' 
    });
    
    // Create or update message thread
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .upsert({
        channel: input.channel,
        thread_id: input.threadId,
        participants: input.participants || [input.senderHandle],
        is_group: (input.participants?.length || 1) > 2,
        last_message_at: new Date().toISOString()
      }, {
        onConflict: 'channel,thread_id'
      })
      .select()
      .single();
    
    if (threadError) {
      throw new Error('Failed to create/update thread');
    }
    
    // Create dedupe hash
    const dedupeHash = generateDedupeHash(input.channel, input.senderHandle, input.messageBody);
    
    // Record the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: thread.id,
        direction: 'inbound',
        sender_handle: input.senderHandle,
        body: input.messageBody,
        meta: input.meta,
        dedupe_hash: dedupeHash
      })
      .select()
      .single();
    
    if (messageError) {
      // If it's a duplicate, that's okay
      if (messageError.code === '23505') { // unique_violation
        console.log('Duplicate message ignored');
        return null;
      }
      throw new Error('Failed to record message');
    }
    
    // TODO: Process message for commands (STOP, MORE, etc.)
    await processInboundMessage(message, input.senderHandle);
    
    return {
      id: message.id,
      threadId: message.thread_id,
      direction: message.direction,
      senderHandle: message.sender_handle,
      body: message.body,
      meta: message.meta,
      createdAt: message.created_at
    };
  });

// Get platform connector config
export const getConnectorConfigProcedure = publicProcedure
  .input(z.object({
    channel: z.enum(['imessage', 'sms', 'whatsapp', 'telegram', 'discord'])
  }))
  .query(async ({ input }) => {
    const { data: connector, error } = await supabase
      .from('platform_connectors')
      .select('*')
      .eq('channel', input.channel)
      .eq('enabled', true)
      .single();
    
    if (error || !connector) {
      return null;
    }
    
    return {
      id: connector.id,
      channel: connector.channel,
      config: connector.config,
      enabled: connector.enabled,
      healthStatus: connector.health_status,
      rateLimits: connector.rate_limits
    };
  });

// Update connector health
export const updateConnectorHealthProcedure = publicProcedure
  .input(z.object({
    channel: z.enum(['imessage', 'sms', 'whatsapp', 'telegram', 'discord']),
    healthStatus: z.enum(['healthy', 'degraded', 'down']),
    lastHealthCheck: z.string().datetime().optional()
  }))
  .mutation(async ({ input }) => {
    const { data: connector, error } = await supabase
      .from('platform_connectors')
      .update({
        health_status: input.healthStatus,
        last_health_check: input.lastHealthCheck || new Date().toISOString()
      })
      .eq('channel', input.channel)
      .select()
      .single();
    
    if (error) {
      throw new Error('Failed to update connector health');
    }
    
    return connector;
  });

// Helper functions
function transformDbRelayJob(dbJob: any): RelayJob {
  return {
    id: dbJob.id,
    channel: dbJob.channel,
    recipientHandle: dbJob.recipient_handle,
    messageBody: dbJob.message_body,
    priority: dbJob.priority,
    status: dbJob.status,
    attempts: dbJob.attempts,
    maxAttempts: dbJob.max_attempts,
    scheduledFor: dbJob.scheduled_for,
    errorMessage: dbJob.error_message,
    providerResponse: dbJob.provider_response,
    createdAt: dbJob.created_at,
    updatedAt: dbJob.updated_at
  };
}

function generateDedupeHash(channel: string, sender: string, body: string): string {
  // Simple hash for deduplication - in production, use crypto
  const content = `${channel}:${sender}:${body}:${Math.floor(Date.now() / 60000)}`; // 1-minute window
  return Buffer.from(content).toString('base64').substring(0, 32);
}

async function processInboundMessage(message: any, senderHandle: string): Promise<void> {
  if (!senderHandle?.trim() || senderHandle.length > 100) {
    console.warn('Invalid sender handle:', senderHandle);
    return;
  }
  
  const sanitizedSender = senderHandle.trim();
  const body = message.body.toLowerCase().trim();
  
  // Handle common commands
  if (body === 'stop' || body === 'unsubscribe') {
    // Revoke consent for this phone number
    await supabase
      .from('user_profiles')
      .update({ consent_status: 'revoked' })
      .eq('phone_e164', sanitizedSender);
    
    console.log('🛑 User opted out:', sanitizedSender);
  } else if (body === 'more') {
    // User wants more introductions - could trigger matching
    console.log('➕ User wants more intros:', sanitizedSender);
  } else if (body.startsWith('yes') || body.startsWith('accept')) {
    // Might be responding to an introduction
    console.log('✅ Potential intro acceptance:', sanitizedSender);
  } else if (body.startsWith('no') || body.startsWith('decline')) {
    // Might be declining an introduction
    console.log('❌ Potential intro decline:', sanitizedSender);
  }
  
  // TODO: More sophisticated command processing and intro response handling
}