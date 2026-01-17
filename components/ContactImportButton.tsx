/**
 * Contact Import Button
 * 
 * UI component for importing contacts from Google or Microsoft
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useContactImport, ImportProvider } from '@/hooks/useContactImport';

interface ContactImportButtonProps {
  provider: ImportProvider;
  onComplete?: (imported: number) => void;
}

export function ContactImportButton({ provider, onComplete }: ContactImportButtonProps) {
  const { startImport, importing, status, error, cancelImport } = useContactImport();

  const providerConfig: Record<ImportProvider, { name: string; color: string; icon: string }> = {
    google: {
      name: 'Google',
      color: '#4285F4',
      icon: '🌐',
    },
    microsoft: {
      name: 'Microsoft',
      color: '#00A4EF',
      icon: '📧',
    },
  };

  const config = providerConfig[provider];

  // Call onComplete when import finishes
  React.useEffect(() => {
    if (status?.status === 'completed' && onComplete) {
      onComplete(status.imported_contacts);
    }
  }, [status?.status, status?.imported_contacts, onComplete]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: importing ? '#999' : config.color }]}
        onPress={() => startImport(provider)}
        disabled={importing}
      >
        {importing ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <>
            <Text style={styles.icon}>{config.icon}</Text>
            <Text style={styles.buttonText}>Import from {config.name}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Progress indicator */}
      {importing && status && (
        <View style={styles.progress}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              {status.status === 'authenticating' && '🔐 Waiting for authentication...'}
              {status.status === 'fetching' && '📥 Fetching contacts...'}
              {status.status === 'processing' && `⚡ Processing contacts...`}
            </Text>
            
            <TouchableOpacity onPress={cancelImport} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          {status.status === 'processing' && status.progress_percent > 0 && (
            <>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${Math.min(100, status.progress_percent)}%` }
                  ]} 
                />
              </View>
              
              <Text style={styles.progressPercent}>{Math.round(status.progress_percent)}%</Text>
            </>
          )}

          {status.total_contacts > 0 && (
            <Text style={styles.progressDetails}>
              {status.processed_contacts} / {status.total_contacts} contacts
            </Text>
          )}
        </View>
      )}

      {/* Completion message */}
      {status?.status === 'completed' && !importing && (
        <View style={styles.success}>
          <Text style={styles.successText}>✓ Import Complete!</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{status.imported_contacts}</Text>
              <Text style={styles.statLabel}>Imported</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{status.skipped_contacts}</Text>
              <Text style={styles.statLabel}>Skipped</Text>
            </View>
            {status.failed_contacts > 0 && (
              <View style={styles.stat}>
                <Text style={[styles.statValue, styles.statValueError]}>{status.failed_contacts}</Text>
                <Text style={styles.statLabel}>Failed</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Error message */}
      {error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <Text style={styles.errorHint}>
            Please try again or check your connection.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    fontSize: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  progress: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 4,
  },
  progressDetails: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  success: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#059669',
  },
  statValueError: {
    color: '#DC2626',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  error: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
    marginBottom: 4,
  },
  errorHint: {
    fontSize: 12,
    color: '#991B1B',
  },
});
