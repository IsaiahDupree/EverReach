/**
 * API Integration Examples
 * 
 * These examples demonstrate how to use the lib/api.ts helpers
 * as documented in FRONTEND_API_INTEGRATION.md
 */

import { apiFetch } from './api';

// ==================== Messages ====================

/**
 * Create/log a message
 * POST /api/v1/messages
 */
export async function createMessage(params: {
  content: string;
  role?: 'user' | 'assistant' | 'system' | 'note';
  thread_id?: string;
  contact_id?: string;
  metadata?: Record<string, any>;
}) {
  const response = await apiFetch('/api/v1/messages', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create message: ${response.status}`);
  }
  
  return response.json();
}

/**
 * List contact timeline (messages + interactions)
 * GET /api/v1/contacts/:id/messages
 */
export async function getContactTimeline(contactId: string, params?: {
  limit?: number;
  cursor?: string;
}) {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.cursor) query.set('cursor', params.cursor);
  
  const queryString = query.toString();
  const path = `/api/v1/contacts/${contactId}/messages${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiFetch(path, {
    method: 'GET',
    requireAuth: true,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get timeline: ${response.status}`);
  }
  
  return response.json();
}

// ==================== Uploads & Files ====================

/**
 * Sign an upload path
 * POST /api/v1/uploads/sign
 */
export async function signUpload(params: {
  path: string;
  contentType?: string;
}) {
  const response = await apiFetch('/api/v1/uploads/sign', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to sign upload: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Link uploaded file to a contact
 * POST /api/v1/contacts/:id/files
 */
export async function linkFileToContact(contactId: string, params: {
  path: string;
  mime_type: string;
  size_bytes: number;
}) {
  const response = await apiFetch(`/api/v1/contacts/${contactId}/files`, {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to link file to contact: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Link uploaded file to an interaction
 * POST /api/v1/interactions/:id/files
 */
export async function linkFileToInteraction(interactionId: string, params: {
  path: string;
  mime_type: string;
  size_bytes: number;
}) {
  const response = await apiFetch(`/api/v1/interactions/${interactionId}/files`, {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to link file to interaction: ${response.status}`);
  }
  
  return response.json();
}

// ==================== Pipelines ====================

/**
 * Get stages for a pipeline (ordered by order_index)
 * GET /api/v1/pipelines/:key/stages
 */
export async function getPipelineStages(pipelineKey: string) {
  const response = await apiFetch(`/api/v1/pipelines/${pipelineKey}/stages`, {
    method: 'GET',
    requireAuth: true,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get pipeline stages: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get contact pipeline state
 * GET /api/v1/contacts/:id/pipeline
 */
export async function getContactPipeline(contactId: string) {
  const response = await apiFetch(`/api/v1/contacts/${contactId}/pipeline`, {
    method: 'GET',
    requireAuth: true,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get contact pipeline: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Update contact pipeline state
 * POST /api/v1/contacts/:id/pipeline
 */
export async function updateContactPipeline(contactId: string, params: {
  stage_key: string;
}) {
  const response = await apiFetch(`/api/v1/contacts/${contactId}/pipeline`, {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update contact pipeline: ${response.status}`);
  }
  
  return response.json();
}

// ==================== Health & Diagnostics ====================

/**
 * Check backend auth wiring
 * GET /api/v1/me
 */
export async function getMe() {
  const response = await apiFetch('/api/v1/me', {
    method: 'GET',
    requireAuth: true,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get user: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Backend environment diagnostics
 * GET /api/v1/ops/config-status
 */
export async function getConfigStatus() {
  const response = await apiFetch('/api/v1/ops/config-status', {
    method: 'GET',
    requireAuth: true,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get config status: ${response.status}`);
  }
  
  return response.json();
}

// ==================== Compose Flow ====================

/**
 * Complete compose flow example:
 * 1. Prepare draft message
 * 2. Send message
 */
export async function composeSendFlow(params: {
  contact_id: string;
  channel: 'email' | 'sms' | 'dm';
  draft: {
    subject?: string;
    body: string;
  };
  template_id?: string;
}) {
  // Step 1: Prepare draft
  const prepareResponse = await apiFetch('/api/v1/messages/prepare', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({
      channel: params.channel,
      contact_id: params.contact_id,
      draft: params.draft,
      composer_context: params.template_id ? { template_id: params.template_id } : {},
    }),
  });
  
  if (!prepareResponse.ok) {
    throw new Error(`Failed to prepare message: ${prepareResponse.status}`);
  }
  
  const prepared = await prepareResponse.json();
  
  // Step 2: Send message
  const sendResponse = await apiFetch('/api/v1/messages/send', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({
      message_id: prepared.message.id,
    }),
  });
  
  if (!sendResponse.ok) {
    throw new Error(`Failed to send message: ${sendResponse.status}`);
  }
  
  return sendResponse.json();
}
