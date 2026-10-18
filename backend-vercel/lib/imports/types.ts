/**
 * Third-Party Contact Import System - Types
 */

export type ImportProvider = 'google' | 'microsoft' | 'apple' | 'csv' | 'manual';

export type ImportStatus = 
  | 'pending'
  | 'authenticating'
  | 'fetching'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ImportAction = 'created' | 'updated' | 'skipped' | 'failed';

/**
 * Import job stored in database
 */
export interface ImportJob {
  id: string;
  user_id: string;
  provider: ImportProvider;
  provider_account_id: string | null;
  provider_account_name: string | null;
  status: ImportStatus;
  total_contacts: number;
  processed_contacts: number;
  imported_contacts: number;
  skipped_contacts: number;
  failed_contacts: number;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  error_message: string | null;
  error_details: Record<string, any> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Imported contact record
 */
export interface ImportedContact {
  id: string;
  import_job_id: string;
  contact_id: string | null;
  provider_contact_id: string;
  provider_etag: string | null;
  action: ImportAction;
  skip_reason: string | null;
  raw_data: Record<string, any>;
  created_at: string;
}

/**
 * Normalized contact from any provider
 */
export interface NormalizedContact {
  provider_contact_id: string;
  provider_etag?: string;
  display_name: string;
  given_name?: string;
  family_name?: string;
  emails: string[];
  phones: string[];
  company?: string;
  job_title?: string;
  birthday?: string;
  notes?: string;
  photo_url?: string;
  raw_data: Record<string, any>;
}

/**
 * OAuth tokens from provider
 */
export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

/**
 * OAuth configuration for a provider
 */
export interface OAuthConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scopes: string[];
  auth_url: string;
  token_url: string;
}

/**
 * Import progress update
 */
export interface ImportProgress {
  total_contacts: number;
  processed_contacts: number;
  imported_contacts: number;
  skipped_contacts: number;
  failed_contacts: number;
  progress_percent: number;
  status: ImportStatus;
}

/**
 * Import result summary
 */
export interface ImportResult {
  job_id: string;
  status: ImportStatus;
  total_contacts: number;
  imported_contacts: number;
  skipped_contacts: number;
  failed_contacts: number;
  duration_seconds: number | null;
  error_message?: string;
}
