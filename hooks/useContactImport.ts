/**
 * Contact Import Hook
 * 
 * Handles OAuth flow and import progress tracking for Google & Microsoft contacts
 */

import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import { apiFetch } from '@/lib/api';
import analytics from '@/lib/analytics';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'https://ever-reach-be.vercel.app';

export type ImportProvider = 'google' | 'microsoft';

export interface ImportStatus {
  id: string;
  provider: ImportProvider;
  status: 'pending' | 'authenticating' | 'fetching' | 'processing' | 'completed' | 'failed';
  total_contacts: number;
  processed_contacts: number;
  imported_contacts: number;
  skipped_contacts: number;
  failed_contacts: number;
  progress_percent: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

interface UseContactImportReturn {
  startImport: (provider: ImportProvider) => Promise<void>;
  cancelImport: () => void;
  importing: boolean;
  status: ImportStatus | null;
  error: string | null;
  currentJobId: string | null;
}

export function useContactImport(): UseContactImportReturn {
  const [importing, setImporting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  /**
   * Check import status
   */
  const checkStatus = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const response = await apiFetch(`/api/v1/contacts/import/status/${jobId}`, {
        method: 'GET',
        requireAuth: true,
      });

      if (!response.ok) {
        throw new Error('Failed to check import status');
      }

      const data: ImportStatus = await response.json();
      setStatus(data);

      // Track progress
      if (data.status === 'processing') {
        analytics.track('contact_import_progress', {
          provider: data.provider,
          progress_percent: data.progress_percent,
          processed: data.processed_contacts,
          total: data.total_contacts,
        });
      }

      // Stop polling if completed or failed
      if (data.status === 'completed') {
        setImporting(false);
        
        analytics.track('contact_import_completed', {
          provider: data.provider,
          imported: data.imported_contacts,
          skipped: data.skipped_contacts,
          failed: data.failed_contacts,
          total: data.total_contacts,
          duration_ms: data.started_at && data.completed_at
            ? new Date(data.completed_at).getTime() - new Date(data.started_at).getTime()
            : undefined,
        });

        return false; // Stop polling
      }

      if (data.status === 'failed') {
        setImporting(false);
        setError(data.error_message || 'Import failed');
        
        analytics.track('contact_import_failed', {
          provider: data.provider,
          error: data.error_message,
        });

        return false; // Stop polling
      }

      return true; // Continue polling
    } catch (err: any) {
      console.error('[useContactImport] Status check error:', err);
      setError(err.message || 'Failed to check status');
      setImporting(false);
      return false;
    }
  }, []);

  /**
   * Start polling loop
   */
  const startPolling = useCallback((jobId: string) => {
    console.log('[useContactImport] Starting polling for job:', jobId);

    const interval = setInterval(async () => {
      const shouldContinue = await checkStatus(jobId);
      if (!shouldContinue) {
        clearInterval(interval);
        setPollingInterval(null);
      }
    }, 2000); // Poll every 2 seconds

    setPollingInterval(interval);
  }, [checkStatus]);

  /**
   * Start import process
   */
  const startImport = useCallback(async (provider: ImportProvider) => {
    try {
      setImporting(true);
      setError(null);
      setStatus(null);

      analytics.track('contact_import_started', {
        provider,
      });

      console.log('[useContactImport] Starting import from:', provider);

      const response = await apiFetch(`/api/v1/contacts/import/${provider}/start`, {
        method: 'POST',
        requireAuth: true,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Import failed: ${response.statusText}`);
      }

      const data = await response.json();
      setCurrentJobId(data.job_id);

      console.log('[useContactImport] Job created:', data.job_id);
      console.log('[useContactImport] Authorization URL:', data.authorization_url);

      // Open OAuth page in browser
      const canOpen = await Linking.canOpenURL(data.authorization_url);
      if (canOpen) {
        await Linking.openURL(data.authorization_url);
        
        analytics.track('contact_import_oauth_opened', {
          provider,
          job_id: data.job_id,
        });

        // Start polling status
        startPolling(data.job_id);
      } else {
        throw new Error('Cannot open browser for authentication');
      }

    } catch (err: any) {
      console.error('[useContactImport] Start import error:', err);
      setError(err.message || 'Failed to start import');
      setImporting(false);
      
      analytics.track('contact_import_start_failed', {
        provider,
        error: err.message,
      });
    }
  }, [startPolling]);

  /**
   * Cancel import
   */
  const cancelImport = useCallback(() => {
    console.log('[useContactImport] Canceling import');
    
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    if (currentJobId && status) {
      analytics.track('contact_import_canceled', {
        provider: status.provider,
        job_id: currentJobId,
        status: status.status,
        progress_percent: status.progress_percent,
      });
    }

    setImporting(false);
    setCurrentJobId(null);
    setStatus(null);
    setError(null);
  }, [pollingInterval, currentJobId, status]);

  return {
    startImport,
    cancelImport,
    importing,
    status,
    error,
    currentJobId,
  };
}
