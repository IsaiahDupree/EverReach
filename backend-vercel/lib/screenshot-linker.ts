/**
 * Screenshot Contact Linker
 * 
 * Links analyzed screenshots to contacts and creates interactions
 * based on extracted entities (emails, phones, names)
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type ScreenshotAnalysis = {
  id: string;
  screenshot_id: string;
  ocr_text: string | null;
  entities: {
    contacts?: Array<{
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      role?: string;
      confidence?: number;
    }>;
    emails?: string[];
    phones?: string[];
    dates?: Array<{ date: string; context: string }>;
    platforms?: string[];
    handles?: string[];
  };
  insights: {
    summary?: string;
    action_items?: string[];
    sentiment?: 'positive' | 'neutral' | 'negative';
    category?: string;
  };
};

export type ContactMatch = {
  contact_id: string;
  match_type: 'email' | 'phone' | 'name';
  confidence: number;
  matched_value: string;
};

export type LinkingResult = {
  screenshot_id: string;
  analysis_id: string;
  linked_contacts: ContactMatch[];
  primary_contact_id: string | null;
  interaction_id: string | null;
  message_direction: 'incoming' | 'outgoing' | null;
  confidence: number;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const MATCH_THRESHOLDS = {
  EMAIL: 0.95,    // Exact email match
  PHONE: 0.90,    // Normalized phone match
  NAME: 0.70,     // Fuzzy name match minimum
  LINK: 0.70,     // Minimum confidence to create link
} as const;

// ============================================================================
// CONTACT MATCHING
// ============================================================================

/**
 * Find contacts matching extracted entities
 */
export async function findMatchingContacts(
  analysis: ScreenshotAnalysis,
  userId: string,
  supabase: SupabaseClient
): Promise<ContactMatch[]> {
  const matches: ContactMatch[] = [];

  // Extract all potential contact identifiers
  const emails = new Set([
    ...(analysis.entities.emails || []),
    ...(analysis.entities.contacts?.map(c => c.email).filter((e): e is string => Boolean(e)) || []),
  ]);

  const phones = new Set([
    ...(analysis.entities.phones || []),
    ...(analysis.entities.contacts?.map(c => c.phone).filter((p): p is string => Boolean(p)) || []),
  ]);

  const names = new Set(
    analysis.entities.contacts?.map(c => c.name).filter((n): n is string => Boolean(n)) || []
  );

  // Match by email (highest confidence)
  for (const email of emails) {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, display_name, emails')
      .eq('user_id', userId)
      .contains('emails', [email.toLowerCase()]);

    if (contacts && contacts.length > 0) {
      for (const contact of contacts) {
        matches.push({
          contact_id: contact.id,
          match_type: 'email',
          confidence: MATCH_THRESHOLDS.EMAIL,
          matched_value: email,
        });
      }
    }
  }

  // Match by phone (normalized)
  for (const phone of phones) {
    const normalizedPhone = normalizePhone(phone);
    
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, display_name, phones')
      .eq('user_id', userId);

    if (contacts) {
      for (const contact of contacts) {
        const contactPhones = contact.phones || [];
        const hasMatch = contactPhones.some(
          (p: string) => normalizePhone(p) === normalizedPhone
        );
        
        if (hasMatch) {
          matches.push({
            contact_id: contact.id,
            match_type: 'phone',
            confidence: MATCH_THRESHOLDS.PHONE,
            matched_value: phone,
          });
        }
      }
    }
  }

  // Match by name (fuzzy, lower confidence)
  for (const name of names) {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, display_name')
      .eq('user_id', userId)
      .ilike('display_name', `%${name}%`);

    if (contacts && contacts.length > 0) {
      for (const contact of contacts) {
        // Calculate similarity score
        const similarity = calculateNameSimilarity(name, contact.display_name);
        if (similarity >= MATCH_THRESHOLDS.NAME) {
          matches.push({
            contact_id: contact.id,
            match_type: 'name',
            confidence: similarity,
            matched_value: name,
          });
        }
      }
    }
  }

  // Deduplicate by contact_id (keep highest confidence)
  const uniqueMatches = new Map<string, ContactMatch>();
  for (const match of matches) {
    const existing = uniqueMatches.get(match.contact_id);
    if (!existing || match.confidence > existing.confidence) {
      uniqueMatches.set(match.contact_id, match);
    }
  }

  return Array.from(uniqueMatches.values())
    .filter(m => m.confidence >= MATCH_THRESHOLDS.LINK)
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Normalize phone number for comparison
 */
function normalizePhone(phone: string): string {
  // Remove all non-digits
  return phone.replace(/\D/g, '');
}

/**
 * Calculate name similarity (simple Levenshtein-based)
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const a = name1.toLowerCase().trim();
  const b = name2.toLowerCase().trim();

  // Exact match
  if (a === b) return 1.0;

  // One contains the other
  if (a.includes(b) || b.includes(a)) {
    return 0.85;
  }

  // Simple Levenshtein distance
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  const similarity = 1 - (distance / maxLength);

  return Math.max(0, similarity);
}

/**
 * Levenshtein distance (edit distance)
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// ============================================================================
// MESSAGE DIRECTION INFERENCE
// ============================================================================

/**
 * Infer message direction (incoming/outgoing)
 */
export function inferMessageDirection(
  analysis: ScreenshotAnalysis,
  matches: ContactMatch[]
): 'incoming' | 'outgoing' | null {
  const category = analysis.insights.category;

  // Business cards are neither incoming nor outgoing
  if (category === 'business_card') {
    return null;
  }

  // For email/chat/social_post, try to infer from content
  // This is a simplified heuristic - in production, you'd want more sophisticated logic
  
  // If we have contacts matched, assume it's from them (incoming)
  if (matches.length > 0 && category === 'email') {
    return 'incoming';
  }

  // If it looks like a sent message
  if (category === 'chat' && analysis.ocr_text?.toLowerCase().includes('you:')) {
    return 'outgoing';
  }

  // Default: cannot determine
  return null;
}

// ============================================================================
// INTERACTION CREATION
// ============================================================================

/**
 * Create interaction from screenshot
 */
export async function createInteractionFromScreenshot(
  screenshotId: string,
  analysis: ScreenshotAnalysis,
  contactId: string,
  direction: 'incoming' | 'outgoing' | null,
  supabase: SupabaseClient
): Promise<string | null> {
  try {
    const content = analysis.insights.summary || 
                   (analysis.ocr_text?.substring(0, 500) || '');

    const { data, error } = await supabase
      .from('interactions')
      .insert({
        contact_id: contactId,
        kind: 'screenshot_message',
        direction,
        content,
        metadata: {
          screenshot_id: screenshotId,
          analysis_id: analysis.id,
          category: analysis.insights.category,
          sentiment: analysis.insights.sentiment,
          action_items: analysis.insights.action_items,
          platforms: analysis.entities.platforms,
          confidence: MATCH_THRESHOLDS.LINK,
        },
        occurred_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Screenshot Linker] Failed to create interaction:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('[Screenshot Linker] Error creating interaction:', error);
    return null;
  }
}

/**
 * Link screenshot as attachment to interaction
 */
export async function linkScreenshotAsAttachment(
  screenshotId: string,
  interactionId: string,
  storagePath: string,
  mimeType: string,
  fileSize: number,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('attachments')
      .insert({
        file_path: storagePath,
        mime_type: mimeType,
        size_bytes: fileSize,
        message_id: null,
        contact_id: null,
        metadata: {
          screenshot_id: screenshotId,
          interaction_id: interactionId,
          linked_at: new Date().toISOString(),
        },
      });

    if (error) {
      console.error('[Screenshot Linker] Failed to create attachment:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Screenshot Linker] Error creating attachment:', error);
    return false;
  }
}

// ============================================================================
// MAIN LINKING FUNCTION
// ============================================================================

/**
 * Link screenshot to contacts and create interactions
 */
export async function linkScreenshotToContacts(
  screenshotId: string,
  analysis: ScreenshotAnalysis,
  userId: string,
  supabase: SupabaseClient
): Promise<LinkingResult> {
  console.log(`[Screenshot Linker] Processing screenshot ${screenshotId}`);

  // Find matching contacts
  const matches = await findMatchingContacts(analysis, userId, supabase);
  console.log(`[Screenshot Linker] Found ${matches.length} contact matches`);

  if (matches.length === 0) {
    console.log('[Screenshot Linker] No contacts matched, skipping linking');
    return {
      screenshot_id: screenshotId,
      analysis_id: analysis.id,
      linked_contacts: [],
      primary_contact_id: null,
      interaction_id: null,
      message_direction: null,
      confidence: 0,
    };
  }

  // Primary contact is highest confidence match
  const primaryMatch = matches[0];
  const direction = inferMessageDirection(analysis, matches);

  console.log(`[Screenshot Linker] Primary contact: ${primaryMatch.contact_id} (${primaryMatch.confidence})`);
  console.log(`[Screenshot Linker] Direction: ${direction || 'unknown'}`);

  // Create interaction for primary contact
  let interactionId: string | null = null;
  
  // Get screenshot details for attachment
  const { data: screenshot } = await supabase
    .from('screenshots')
    .select('storage_key, mime_type, file_size')
    .eq('id', screenshotId)
    .single();

  if (screenshot) {
    interactionId = await createInteractionFromScreenshot(
      screenshotId,
      analysis,
      primaryMatch.contact_id,
      direction,
      supabase
    );

    // Link screenshot as attachment if interaction created
    if (interactionId) {
      await linkScreenshotAsAttachment(
        screenshotId,
        interactionId,
        screenshot.storage_key,
        screenshot.mime_type,
        screenshot.file_size,
        supabase
      );
      console.log(`[Screenshot Linker] Created interaction ${interactionId}`);
    }
  }

  // Update analysis with linking metadata
  await supabase
    .from('screenshot_analysis')
    .update({
      metadata: {
        linked_contacts: matches.map(m => m.contact_id),
        primary_contact_id: primaryMatch.contact_id,
        message_direction: direction,
        link_confidence: primaryMatch.confidence,
        linked_at: new Date().toISOString(),
      },
    })
    .eq('id', analysis.id);

  return {
    screenshot_id: screenshotId,
    analysis_id: analysis.id,
    linked_contacts: matches,
    primary_contact_id: primaryMatch.contact_id,
    interaction_id: interactionId,
    message_direction: direction,
    confidence: primaryMatch.confidence,
  };
}

/**
 * Get linking status for a screenshot
 */
export async function getScreenshotLinkingStatus(
  screenshotId: string,
  supabase: SupabaseClient
): Promise<LinkingResult | null> {
  const { data: analysis } = await supabase
    .from('screenshot_analysis')
    .select('id, metadata')
    .eq('screenshot_id', screenshotId)
    .single();

  if (!analysis || !analysis.metadata) {
    return null;
  }

  const metadata = analysis.metadata as any;

  return {
    screenshot_id: screenshotId,
    analysis_id: analysis.id,
    linked_contacts: metadata.linked_contacts?.map((id: string) => ({
      contact_id: id,
      match_type: 'unknown' as const,
      confidence: metadata.link_confidence || 0,
      matched_value: '',
    })) || [],
    primary_contact_id: metadata.primary_contact_id || null,
    interaction_id: null, // Not stored in metadata
    message_direction: metadata.message_direction || null,
    confidence: metadata.link_confidence || 0,
  };
}
