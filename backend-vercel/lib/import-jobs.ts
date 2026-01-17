/**
 * Import Jobs Management
 * Tracks OAuth import jobs in database
 */

import { getClientOrThrow } from './supabase';

export type ImportStatus = 'pending' | 'authenticating' | 'fetching' | 'processing' | 'completed' | 'failed';
export type ImportProvider = 'google' | 'microsoft' | 'icloud';

export interface ImportJob {
  id: string;
  user_id: string;
  provider: ImportProvider;
  status: ImportStatus;
  total_contacts: number;
  imported_contacts: number;
  skipped_contacts: number;
  failed_contacts: number;
  progress_percent: number;
  provider_account_name?: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  oauth_state?: string;
  refresh_token?: string;
}

/**
 * Create a new import job
 */
export async function createImportJob(
  req: Request,
  userId: string,
  provider: ImportProvider,
  oauthState: string
): Promise<ImportJob> {
  const supabase = getClientOrThrow(req);
  
  const { data, error } = await supabase
    .from('contact_import_jobs')
    .insert({
      user_id: userId,
      provider,
      status: 'pending',
      total_contacts: 0,
      imported_contacts: 0,
      skipped_contacts: 0,
      failed_contacts: 0,
      progress_percent: 0,
      oauth_state: oauthState,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[ImportJobs] Failed to create job:', error);
    throw new Error('Failed to create import job');
  }

  return data as ImportJob;
}

/**
 * Update import job status
 */
export async function updateImportJob(
  req: Request,
  jobId: string,
  updates: Partial<ImportJob>
): Promise<void> {
  const supabase = getClientOrThrow(req);
  
  const { error } = await supabase
    .from('contact_import_jobs')
    .update(updates)
    .eq('id', jobId);

  if (error) {
    console.error('[ImportJobs] Failed to update job:', error);
    throw new Error('Failed to update import job');
  }
}

/**
 * Get import job by ID
 */
export async function getImportJob(
  req: Request,
  jobId: string,
  userId: string
): Promise<ImportJob | null> {
  const supabase = getClientOrThrow(req);
  
  const { data, error } = await supabase
    .from('contact_import_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('[ImportJobs] Failed to get job:', error);
    return null;
  }

  return data as ImportJob;
}

/**
 * Get import job by OAuth state
 */
export async function getImportJobByState(
  req: Request,
  oauthState: string
): Promise<ImportJob | null> {
  const supabase = getClientOrThrow(req);
  
  const { data, error } = await supabase
    .from('contact_import_jobs')
    .select('*')
    .eq('oauth_state', oauthState)
    .single();

  if (error) {
    console.error('[ImportJobs] Failed to get job by state:', error);
    return null;
  }

  return data as ImportJob;
}

/**
 * List import jobs for user
 */
export async function listImportJobs(
  req: Request,
  userId: string,
  limit: number = 10
): Promise<ImportJob[]> {
  const supabase = getClientOrThrow(req);
  
  const { data, error } = await supabase
    .from('contact_import_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ImportJobs] Failed to list jobs:', error);
    return [];
  }

  return data as ImportJob[];
}
