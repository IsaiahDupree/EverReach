import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Cloud, Mail, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { apiFetch } from '@/lib/api';
import { useAnalytics } from '@/hooks/useAnalytics';

// Feature flag - set to 'false' to disable third-party imports (Phase 2)
const ENABLE_THIRD_PARTY_IMPORTS = process.env.EXPO_PUBLIC_ENABLE_THIRD_PARTY_IMPORTS !== 'false';

type Provider = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  status: 'available' | 'coming_soon';
};

type ImportJob = {
  id: string;
  provider: string;
  status: 'pending' | 'authenticating' | 'fetching' | 'processing' | 'contacts_fetched' | 'completed' | 'failed';
  total_contacts: number;
  imported_contacts: number;
  skipped_contacts: number;
  failed_contacts: number;
  progress_percent: number;
  provider_account_name?: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
};

const PROVIDERS: Provider[] = [
  {
    id: 'google',
    name: 'Google Contacts',
    description: 'Import from Gmail and Google Workspace',
    icon: Mail,
    color: '#4285F4',
    status: 'coming_soon', // Temporarily disabled
  },
  {
    id: 'microsoft',
    name: 'Microsoft Outlook',
    description: 'Import from Outlook and Office 365',
    icon: Mail,
    color: '#0078D4',
    status: 'coming_soon', // Temporarily disabled
  },
  {
    id: 'icloud',
    name: 'iCloud Contacts',
    description: 'Import from Apple iCloud',
    icon: Cloud,
    color: '#007AFF',
    status: 'coming_soon',
  },
  {
    id: 'csv',
    name: 'CSV Upload',
    description: 'Import from CSV or Excel file',
    icon: FileText,
    color: '#10B981',
    status: 'coming_soon',
  },
];

export default function ImportThirdPartyScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  const screenAnalytics = useAnalytics('ImportThirdParty');
  const params = useLocalSearchParams<{ job_id?: string }>();
  
  const [importing, setImporting] = useState(false);
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<ImportJob[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [providerHealth, setProviderHealth] = useState<Record<string, boolean>>({});
  const [checkingHealth, setCheckingHealth] = useState(true);

  useEffect(() => {
    loadImportHistory();
    checkProviderHealth();
    
    // Check if redirected from OAuth with job_id
    if (params.job_id) {
      console.log('[ImportThirdParty] OAuth redirect detected, job_id:', params.job_id);
      setImporting(true);
      checkImportStatus(params.job_id);
    }
    
    // Listen for deep link callback from OAuth
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  // Poll status when there's an active job
  useEffect(() => {
    if (currentJob && ['fetching', 'processing'].includes(currentJob.status)) {
      const interval = setInterval(() => {
        checkImportStatus(currentJob.id);
      }, 2000); // Poll every 2 seconds
      
      return () => clearInterval(interval);
    }
  }, [currentJob]);

  const handleDeepLink = async ({ url }: { url: string }) => {
    // Handle OAuth callback deep link
    // Format: everreach://import-callback/{provider}?job_id=xxx
    const match = url.match(/import-callback\/(\w+)\?job_id=([\w-]+)/);
    if (match) {
      const [, provider, jobId] = match;
      console.log('[ImportThirdParty] OAuth callback received:', provider, jobId);
      await checkImportStatus(jobId);
    }
  };

  const checkProviderHealth = async () => {
    try {
      setCheckingHealth(true);
      const response = await apiFetch('/api/v1/contacts/import/health', {
        method: 'GET',
        requireAuth: false, // Health check doesn't require auth
      });

      if (response.ok) {
        const { providers } = await response.json();
        const health: Record<string, boolean> = {};
        Object.keys(providers).forEach(key => {
          health[key] = providers[key].configured;
        });
        setProviderHealth(health);
        console.log('[ImportThirdParty] Provider health:', health);
      }
    } catch (error) {
      console.error('[ImportThirdParty] Failed to check provider health:', error);
      // Assume all available if health check fails
      setProviderHealth({ google: true, microsoft: true });
    } finally {
      setCheckingHealth(false);
    }
  };

  const loadImportHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await apiFetch('/api/v1/contacts/import/list?limit=5', {
        method: 'GET',
        requireAuth: true,
      });

      if (response.ok) {
        const { jobs } = await response.json();
        setRecentJobs(jobs || []);
      }
    } catch (error) {
      console.error('[ImportThirdParty] Failed to load history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const checkImportStatus = async (jobId: string) => {
    try {
      const response = await apiFetch(`/api/v1/contacts/import/status/${jobId}`, {
        method: 'GET',
        requireAuth: true,
      });

      if (response.ok) {
        const job: ImportJob = await response.json();
        setCurrentJob(job);

        // NEW: Navigate to contact selection screen when contacts are fetched
        if (job.status === 'contacts_fetched') {
          console.log('[ImportThirdParty] Contacts fetched, navigating to review screen');
          setImporting(false);
          setCurrentJob(null);
          router.push(`/import-contacts-review?job_id=${jobId}` as any);
          
          screenAnalytics.track('import_contacts_fetched', {
            provider: job.provider,
            total_contacts: job.total_contacts,
          });
          return;
        }

        if (job.status === 'completed') {
          setImporting(false);
          
          // Special message for 0 contacts
          const message = job.imported_contacts === 0 && job.total_contacts === 0
            ? `No contacts found in your ${job.provider} account. You may need to add contacts first or check permissions.`
            : `Successfully imported ${job.imported_contacts} contacts${job.skipped_contacts > 0 ? ` (${job.skipped_contacts} skipped)` : ''}.`;
          
          Alert.alert(
            job.imported_contacts === 0 && job.total_contacts === 0 ? 'No Contacts Found' : 'Import Complete!',
            message,
            [{ text: 'OK', onPress: () => {
              setCurrentJob(null);
              loadImportHistory();
            }}]
          );
          
          screenAnalytics.track('import_completed', {
            provider: job.provider,
            imported: job.imported_contacts,
            skipped: job.skipped_contacts,
            failed: job.failed_contacts,
          });
        } else if (job.status === 'failed') {
          setImporting(false);
          Alert.alert(
            'Import Failed',
            job.error_message || 'Something went wrong. Please try again.',
            [{ text: 'OK', onPress: () => setCurrentJob(null) }]
          );
          
          screenAnalytics.track('import_failed', {
            provider: job.provider,
            error: job.error_message,
          });
        }
      }
    } catch (error) {
      console.error('[ImportThirdParty] Failed to check status:', error);
    }
  };

  const startImport = async (providerId: string) => {
    const provider = PROVIDERS.find(p => p.id === providerId);
    if (!provider) return;

    // Check if provider is configured on backend
    if (!providerHealth[providerId]) {
      Alert.alert(
        'Configuration Required',
        `${provider.name} import requires OAuth setup on the backend. Please contact support or check back later.`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (provider.status === 'coming_soon') {
      Alert.alert(
        'Coming Soon',
        `${provider.name} import will be available soon. We're working on it!`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setImporting(true);
      screenAnalytics.track('import_started', { provider: providerId });

      // Step 1: Start OAuth flow
      const response = await apiFetch(`/api/v1/contacts/import/${providerId}/start`, {
        method: 'POST',
        requireAuth: true,
      });

      if (!response.ok) {
        throw new Error('Failed to start import');
      }

      const { job_id, authorization_url } = await response.json();
      
      // Create initial job for status tracking
      setCurrentJob({
        id: job_id,
        provider: providerId,
        status: 'authenticating',
        total_contacts: 0,
        imported_contacts: 0,
        skipped_contacts: 0,
        failed_contacts: 0,
        progress_percent: 0,
        started_at: new Date().toISOString(),
      });

      // Step 2: Open OAuth URL in browser
      const canOpen = await Linking.canOpenURL(authorization_url);
      if (canOpen) {
        await Linking.openURL(authorization_url);
        // User will complete OAuth in browser
        // Callback will return via deep link
      } else {
        throw new Error('Cannot open OAuth URL');
      }

    } catch (error) {
      console.error('[ImportThirdParty] Import failed:', error);
      Alert.alert('Error', 'Failed to start import. Please try again.');
      setImporting(false);
      setCurrentJob(null);
    }
  };

  const handleProviderSelect = (providerId: string) => {
    startImport(providerId);
  };

  const handleBack = () => {
    // Try to go back, but if no history (e.g., from deep link), go to settings
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/settings');
    }
  };

  // Show disabled message if feature is turned off
  if (!ENABLE_THIRD_PARTY_IMPORTS) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen 
          options={{
            title: 'Import from Third Parties',
            headerShown: true,
            headerLeft: () => (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <ArrowLeft size={24} color={theme.colors.text} />
              </TouchableOpacity>
            ),
          }} 
        />
        
        <View style={[styles.content, styles.disabledContainer]}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
              <AlertCircle size={48} color={theme.colors.textSecondary} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Feature Coming Soon
            </Text>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              Third-party imports (Google, Outlook, iCloud, CSV) will be available in Phase 2.{'\n\n'}
              For now, you can import contacts from your device contacts in Settings.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen 
        options={{
          title: 'Import from Third Parties',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
              <Cloud size={48} color={theme.colors.text} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Connect Your Accounts
            </Text>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              Import contacts from your favorite services. Your data stays private and secure.
            </Text>
          </View>

          {/* Active Import Progress */}
          {currentJob && ['authenticating', 'fetching', 'processing'].includes(currentJob.status) && (
            <View style={[styles.progressCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressTitle, { color: theme.colors.text }]}>
                  Importing {currentJob.provider} contacts...
                </Text>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
              
              {currentJob.status === 'authenticating' && (
                <Text style={[styles.progressStatus, { color: theme.colors.textSecondary }]}>
                  ⏳ Waiting for authorization...
                </Text>
              )}
              
              {currentJob.status === 'fetching' && (
                <Text style={[styles.progressStatus, { color: theme.colors.textSecondary }]}>
                  📥 Fetching contacts from {currentJob.provider}...
                </Text>
              )}
              
              {currentJob.status === 'processing' && (
                <View>
                  <Text style={[styles.progressStatus, { color: theme.colors.textSecondary }]}>
                    Processing: {currentJob.imported_contacts}/{currentJob.total_contacts} contacts
                  </Text>
                  <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { backgroundColor: theme.colors.primary, width: `${currentJob.progress_percent}%` }
                      ]} 
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Provider Cards */}
          <View style={styles.providersContainer}>
            {PROVIDERS.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                style={[
                  styles.providerCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => handleProviderSelect(provider.id)}
                activeOpacity={0.7}
                disabled={importing}
              >
                <View style={styles.providerLeft}>
                  <View style={[styles.providerIcon, { backgroundColor: `${provider.color}15` }]}>
                    <provider.icon size={24} color={provider.color} />
                  </View>
                  <View style={styles.providerInfo}>
                    <Text style={[styles.providerName, { color: theme.colors.text }]}>
                      {provider.name}
                    </Text>
                    <Text style={[styles.providerDescription, { color: theme.colors.textSecondary }]}>
                      {provider.description}
                    </Text>
                  </View>
                </View>
                {provider.status === 'coming_soon' ? (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Soon</Text>
                  </View>
                ) : provider.status === 'available' ? (
                  <CheckCircle size={20} color={provider.color} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>

          {/* Info Box */}
          <View style={[styles.infoBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
              🔒 Privacy First
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              • We only access contacts you explicitly choose to import{'\n'}
              • Your credentials are never stored{'\n'}
              • All imports happen through secure OAuth{'\n'}
              • You can export or delete your data anytime
            </Text>
          </View>

          {/* Import History */}
          {recentJobs.length > 0 && (
            <View style={styles.historySection}>
              <Text style={[styles.historyTitle, { color: theme.colors.text }]}>
                Recent Imports
              </Text>
              {recentJobs.map((job) => (
                <View 
                  key={job.id} 
                  style={[styles.historyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                >
                  <View style={styles.historyHeader}>
                    <Text style={[styles.historyProvider, { color: theme.colors.text }]}>
                      {job.provider.charAt(0).toUpperCase() + job.provider.slice(1)}
                    </Text>
                    {job.status === 'completed' && <CheckCircle size={16} color="#10B981" />}
                    {job.status === 'failed' && <AlertCircle size={16} color="#EF4444" />}
                    {job.status === 'processing' && <Clock size={16} color="#F59E0B" />}
                  </View>
                  <Text style={[styles.historyStats, { color: theme.colors.textSecondary }]}>
                    {job.status === 'completed' ? (
                      `✓ Imported ${job.imported_contacts} contacts${job.skipped_contacts > 0 ? ` • ${job.skipped_contacts} skipped` : ''}`
                    ) : job.status === 'failed' ? (
                      `✗ Failed: ${job.error_message || 'Unknown error'}`
                    ) : (
                      `Processing...`
                    )}
                  </Text>
                  <Text style={[styles.historyDate, { color: theme.colors.textSecondary }]}>
                    {new Date(job.started_at).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Coming Soon Note */}
          <View style={styles.comingSoonNote}>
            <Text style={[styles.comingSoonNoteText, { color: theme.colors.textSecondary }]}>
              💡 We're actively working on these integrations. Check back soon or use{' '}
              <Text style={{ fontWeight: '600', color: theme.colors.primary }}>
                Import from Phone Contacts
              </Text>
              {' '}to get started now.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  providersContainer: {
    gap: 12,
    marginBottom: 24,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  providerCardSelected: {
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  providerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  providerDescription: {
    fontSize: 14,
    color: '#666666',
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  comingSoonNote: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  comingSoonNoteText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
    textAlign: 'center',
  },
  // Progress tracking styles
  progressCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  progressStatus: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  // Import history styles
  historySection: {
    marginBottom: 24,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  historyCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyProvider: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  historyStats: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: '#999999',
  },
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
