/**
 * Intelligent Query Router
 * 
 * Analyzes natural language queries and routes them to the optimal backend endpoint.
 * Uses pattern matching and keyword detection to determine intent and entity types.
 */

import { apiFetch } from './api';
import { API_ENDPOINTS } from '@/constants/endpoints';

export interface QueryIntent {
  action: 'search' | 'create' | 'update' | 'analyze' | 'retrieve' | 'list';
  entityType: 'contact' | 'interaction' | 'note' | 'goal' | 'message' | 'warmth' | 'unknown';
  endpoint: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  params?: Record<string, any>;
  body?: Record<string, any>;
  confidence: number;
  reasoning: string;
}

export interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
  intent: QueryIntent;
  executionTimeMs: number;
}

// Query patterns for intent detection
const PATTERNS = {
  // Contact queries
  followUp: {
    pattern: /who should (i|we) (follow up|reach out|contact|talk to|check in|touch base)/i,
    intent: { action: 'analyze' as const, entityType: 'warmth' as const },
    endpoint: API_ENDPOINTS.CONTACTS,
    params: { sort: 'warmth_asc', limit: 10 },
  },
  coldContacts: {
    pattern: /(show|find|get|list) contacts?.*(haven't|didnt|not|never).*(talk|contact|reach|interact|engage)/i,
    intent: { action: 'search' as const, entityType: 'contact' as const },
    endpoint: API_ENDPOINTS.CONTACTS,
    params: { status: 'cold', sort: 'last_interaction_asc' },
  },
  contactByName: {
    pattern: /(tell me|show|find|get|info).*(about|for).+/i,
    intent: { action: 'retrieve' as const, entityType: 'contact' as const },
    endpoint: API_ENDPOINTS.CONTACTS_SEARCH,
  },
  recentContacts: {
    pattern: /(recent|new|latest) contacts?/i,
    intent: { action: 'list' as const, entityType: 'contact' as const },
    endpoint: API_ENDPOINTS.CONTACTS,
    params: { sort: 'created_at_desc', limit: 20 },
  },
  
  // Note/Interaction queries
  noteSearch: {
    pattern: /search.*(notes?|conversations?|interactions?).*(for|about|containing)/i,
    intent: { action: 'search' as const, entityType: 'note' as const },
    endpoint: API_ENDPOINTS.SEARCH,
  },
  addNote: {
    pattern: /(add|create|make|write|log).*(note|reminder|memo|interaction)/i,
    intent: { action: 'create' as const, entityType: 'interaction' as const },
    endpoint: API_ENDPOINTS.INTERACTIONS,
  },
  recentInteractions: {
    pattern: /(recent|latest|last).*(notes?|conversations?|interactions?)/i,
    intent: { action: 'list' as const, entityType: 'interaction' as const },
    endpoint: API_ENDPOINTS.INTERACTIONS,
    params: { sort: 'created_at_desc', limit: 20 },
  },
  
  // Analysis queries
  summarize: {
    pattern: /(summarize|sum up|recap|overview|review).*(notes?|conversations?|interactions?)/i,
    intent: { action: 'analyze' as const, entityType: 'interaction' as const },
    endpoint: API_ENDPOINTS.INTERACTIONS,
    params: { limit: 50, sort: 'created_at_desc' },
  },
  warmthInsights: {
    pattern: /(warmth|temperature|health|status).*(score|analysis|insight|overview|summary)/i,
    intent: { action: 'analyze' as const, entityType: 'warmth' as const },
    endpoint: '/api/v1/warmth/summary',
  },
  insights: {
    pattern: /(insights?|trends?|patterns?|analytics|stats|statistics)/i,
    intent: { action: 'analyze' as const, entityType: 'contact' as const },
    endpoint: '/api/v1/warmth/summary',
  },
  
  // Goal queries
  goals: {
    pattern: /(goals?|objectives?|targets?).*(list|show|get|view)/i,
    intent: { action: 'list' as const, entityType: 'goal' as const },
    endpoint: API_ENDPOINTS.GOALS,
  },
  
  // Message queries
  sendMessage: {
    pattern: /(send|draft|compose|write).*(message|email|text|note)/i,
    intent: { action: 'create' as const, entityType: 'message' as const },
    endpoint: API_ENDPOINTS.MESSAGE_PREPARE,
  },
  
  // Catch-all search
  generalSearch: {
    pattern: /(search|find|look for|lookup)/i,
    intent: { action: 'search' as const, entityType: 'unknown' as const },
    endpoint: API_ENDPOINTS.SEARCH,
  },
};

/**
 * Analyze a natural language query and determine the best endpoint to use
 */
export function analyzeQuery(query: string): QueryIntent {
  const normalizedQuery = query.trim().toLowerCase();
  
  // Try to match patterns
  for (const [key, pattern] of Object.entries(PATTERNS)) {
    if (pattern.pattern.test(normalizedQuery)) {
      const confidence = calculateConfidence(normalizedQuery, pattern.pattern);
      
      return {
        action: pattern.intent.action,
        entityType: pattern.intent.entityType,
        endpoint: pattern.endpoint,
        method: pattern.intent.action === 'create' ? 'POST' : 'GET',
        params: extractParams(normalizedQuery, 'params' in pattern ? pattern.params : undefined),
        confidence,
        reasoning: `Matched pattern: ${key}`,
      };
    }
  }
  
  // Fallback: general search
  return {
    action: 'search',
    entityType: 'unknown',
    endpoint: API_ENDPOINTS.SEARCH,
    method: 'POST',
    body: { q: query },
    confidence: 0.3,
    reasoning: 'No specific pattern matched, using general search',
  };
}

/**
 * Execute a query using the analyzed intent
 */
export async function routeAndExecuteQuery(query: string): Promise<QueryResult> {
  const startTime = Date.now();
  
  try {
    // Analyze the query
    const intent = analyzeQuery(query);
    
    console.log('[QueryRouter] Analyzed query:', {
      query,
      intent: intent.action,
      entityType: intent.entityType,
      endpoint: intent.endpoint,
      confidence: intent.confidence,
    });
    
    // Build the request
    let url = intent.endpoint;
    const options: any = {
      method: intent.method,
      requireAuth: true,
    };
    
    // Add query params for GET requests
    if (intent.method === 'GET' && intent.params) {
      const params = new URLSearchParams(intent.params as any);
      url = `${url}?${params.toString()}`;
    }
    
    // Add body for POST requests
    if (intent.method === 'POST' && intent.body) {
      options.body = JSON.stringify(intent.body);
    }
    
    // Execute the request
    const response = await apiFetch(url, options);
    const data = await response.json();
    
    const executionTimeMs = Date.now() - startTime;
    
    // Track the query execution
    trackQueryExecution(query, intent, true, executionTimeMs);
    
    return {
      success: true,
      data,
      intent,
      executionTimeMs,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    const intent = analyzeQuery(query);
    
    console.error('[QueryRouter] Query execution failed:', error);
    
    // Track failed query
    trackQueryExecution(query, intent, false, executionTimeMs);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      intent,
      executionTimeMs,
    };
  }
}

/**
 * Calculate confidence score based on pattern match quality
 */
function calculateConfidence(query: string, pattern: RegExp): number {
  const match = query.match(pattern);
  if (!match) return 0;
  
  // Higher confidence for longer matches
  const matchLength = match[0].length;
  const queryLength = query.length;
  const lengthRatio = matchLength / queryLength;
  
  // Base confidence + bonus for good match coverage
  return Math.min(0.7 + (lengthRatio * 0.3), 0.99);
}

/**
 * Extract parameters from query text
 */
function extractParams(query: string, baseParams?: Record<string, any>): Record<string, any> {
  const params = { ...baseParams };
  
  // Extract number of days/weeks/months
  const timeMatch = query.match(/(\d+)\s*(day|week|month)s?/i);
  if (timeMatch) {
    const [, amount, unit] = timeMatch;
    params.timeframe = `${amount}${unit[0]}`;
  }
  
  // Extract limits
  const limitMatch = query.match(/(top|first|last)\s*(\d+)/i);
  if (limitMatch) {
    params.limit = parseInt(limitMatch[2], 10);
  }
  
  // Extract names (simple heuristic)
  const aboutMatch = query.match(/about\s+([A-Z][a-z]+(\s+[A-Z][a-z]+)?)/);
  if (aboutMatch) {
    params.q = aboutMatch[1];
  }
  
  return params;
}

/**
 * Track query execution for analytics and trending
 */
async function trackQueryExecution(
  query: string,
  intent: QueryIntent,
  success: boolean,
  executionTimeMs: number
): Promise<void> {
  try {
    await apiFetch('/api/v1/queries', {
      method: 'POST',
      body: JSON.stringify({
        query_text: query,
        intent: intent.action,
        entity_type: intent.entityType,
        endpoint_used: intent.endpoint,
        response_time_ms: executionTimeMs,
        success,
      }),
      requireAuth: true,
    });
  } catch (error) {
    console.error('[QueryRouter] Failed to track query:', error);
    // Non-blocking - don't fail the query if tracking fails
  }
}

/**
 * Get suggested queries based on context
 */
export function getSuggestedQueries(context: {
  hasContacts?: boolean;
  hasNotes?: boolean;
  hasGoals?: boolean;
}): string[] {
  const suggestions: string[] = [];
  
  if (context.hasContacts) {
    suggestions.push(
      'Who should I follow up with this week?',
      'Show me contacts I haven\'t talked to recently',
      'Get warmth insights for my network'
    );
  }
  
  if (context.hasNotes) {
    suggestions.push(
      'Search my notes for client discussions',
      'Summarize my recent conversations'
    );
  }
  
  if (context.hasGoals) {
    suggestions.push(
      'Show my active goals',
      'List goals that need attention'
    );
  }
  
  // Always include these
  suggestions.push(
    'Add a note about my last meeting',
    'Find contacts in tech industry',
    'Show relationship health overview'
  );
  
  return suggestions.slice(0, 8);
}
