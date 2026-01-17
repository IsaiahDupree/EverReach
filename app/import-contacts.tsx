import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { go } from '@/lib/navigation';
import { Users, CheckCircle, XCircle, ArrowLeft, Settings, AlertCircle, UserPlus, Info, X } from 'lucide-react-native';
import { usePeople } from '@/providers/PeopleProvider';
import * as Contacts from 'expo-contacts';

import { loadHistory, saveHistory } from '@/helpers/contactsImport';
import { pickOneNativeContact, pickLoopNativeContacts, showIosLimitedAccessPicker } from '@/helpers/nativePicker';
import { startDiagnosticCapture, stopDiagnosticCapture } from '@/helpers/diagnosticLogger';
type ImportSessionState = 'idle' | 'running' | 'complete' | 'error';

type ImportHistoryEntry = {
  id: string;
  date: number;
  imported: number;
  total: number;
  status: 'success' | 'error';
  error?: string;
  diagnosticLogs?: DiagnosticLog[];
};

type DiagnosticLog = {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
};

const MAX_HISTORY_ENTRIES = 5;

export default function ImportContactsScreen() {
  const insets = useSafeAreaInsets();
  const { people, addPerson } = usePeople();
  const [sessionState, setSessionState] = useState<ImportSessionState>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, imported: 0 });
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>([]);
  const [nativeBusy, setNativeBusy] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | 'limited'>('undetermined');
  const [contactsCount, setContactsCount] = useState<number>(0);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<ImportHistoryEntry | null>(null);
  const [currentDiagnosticLogs, setCurrentDiagnosticLogs] = useState<DiagnosticLog[]>([]);
  const [diagnosticPanelExpanded, setDiagnosticPanelExpanded] = useState<boolean>(false);
  const deviceSupported = Platform.OS !== 'web';

  useEffect(() => {
    (async () => {
      const hist = await loadHistory<ImportHistoryEntry[]>();
      setImportHistory(Array.isArray(hist) ? hist : []);
      // Check permission status
      await checkPermissionStatus();
    })();
    return () => {
      setSessionState('idle');
    };
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      if (status === 'granted') {
        setPermissionStatus('granted');
        // Get contact count (includes both device and SIM contacts on Android)
        // On Android, READ_CONTACTS permission provides access to all contacts including SIM card
        const { data } = await Contacts.getContactsAsync({ 
          pageSize: 0,
          // Expo Contacts automatically includes SIM contacts when READ_CONTACTS is granted
        });
        setContactsCount(data.length);
        console.log('[ImportContacts] Contacts available (device + SIM):', data.length);
      } else if (status === 'denied') {
        setPermissionStatus('denied');
      } else {
        setPermissionStatus('undetermined');
      }
    } catch (error) {
      console.error('[ImportContacts] Failed to check permissions:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        setPermissionStatus('granted');
        await checkPermissionStatus();
        Alert.alert(
          'Access Granted',
          'You can now import contacts from your address book.',
          [{ text: 'OK' }]
        );
      } else if (status === 'denied') {
        setPermissionStatus('denied');
        Alert.alert(
          'Permission Denied',
          'Contacts access is required to import. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    } catch (error) {
      console.error('Failed to request permissions:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
    }
  };

  const saveImportHistory = async (entry: ImportHistoryEntry) => {
    try {
      const newHistory = [entry, ...importHistory].slice(0, MAX_HISTORY_ENTRIES);
      setImportHistory(newHistory);
      await saveHistory(newHistory);
    } catch (error) {
      console.warn('Failed to save import history:', error);
    }
  };

  const resetSession = () => {
    setSessionState('idle');
    setProgress({ current: 0, total: 0, imported: 0 });
  };

  const handleDone = () => {
    resetSession();
    go.back();
  };

  const handlePickOne = async () => {
    if (permissionStatus !== 'granted') {
      await requestPermissions();
      return;
    }
    setNativeBusy(true);
    // Start capturing diagnostic logs
    startDiagnosticCapture();
    try {
      const start = Date.now();
      const res = await pickOneNativeContact(people, (p) => Promise.resolve(addPerson(p)));
      // Stop capturing and get logs
      const diagnosticLogs = stopDiagnosticCapture();
      // Check if import failed and provide helpful message
      if (res.errors > 0 && res.imported === 0) {
        Alert.alert(
          'Import Failed',
          'This contact may be missing required information (phone number or email address). Please select a contact with at least one phone number or email address.',
          [{ text: 'OK' }]
        );
        setSessionState('error');
      } else {
        setSessionState('complete');
      }
      const entry: ImportHistoryEntry = {
        id: start.toString(),
        date: start,
        imported: res.imported,
        total: res.total,
        status: res.errors ? 'error' : 'success',
        error: res.errors ? `Contact missing phone/email` : (res.duplicates ? `${res.duplicates} duplicates` : undefined),
        diagnosticLogs: diagnosticLogs.length > 0 ? diagnosticLogs : undefined,
      };
      await saveImportHistory(entry);
      setProgress({ current: res.total, total: res.total, imported: res.imported });
    } catch (error) {
      // Stop capturing on error too
      const diagnosticLogs = stopDiagnosticCapture();
      console.error('Failed to pick contact:', error);
      Alert.alert('Error', 'Failed to import contact. Please try again.');
      setSessionState('error');
      // Save error to history with logs
      const entry: ImportHistoryEntry = {
        id: Date.now().toString(),
        date: Date.now(),
        imported: 0,
        total: 1,
        status: 'error',
        error: 'Unexpected error during import',
        diagnosticLogs: diagnosticLogs.length > 0 ? diagnosticLogs : undefined,
      };
      await saveImportHistory(entry);
    } finally { 
      setNativeBusy(false); 
    }
  };

  const handlePickMultiple = async () => {
    if (permissionStatus !== 'granted') {
      await requestPermissions();
      return;
    }
    setNativeBusy(true);
    try {
      setSessionState('running');
      setProgress({ current: 0, total: 0, imported: 0 });
      const start = Date.now();
      const res = await pickLoopNativeContacts(
        people,
        (p) => Promise.resolve(addPerson(p)),
        (current, imported) => setProgress({ current, total: current, imported })
      );
      const entry: ImportHistoryEntry = {
        id: start.toString(),
        date: start,
        imported: res.imported,
        total: res.total,
        status: res.errors ? 'error' : 'success',
        error: res.errors || res.duplicates ? `${res.errors} errors, ${res.duplicates} duplicates` : undefined,
      };
      await saveImportHistory(entry);
      setSessionState('complete');
    } catch (error) {
      console.error('Failed to pick contacts:', error);
      setSessionState('error');
      Alert.alert('Error', 'Failed to import contacts. Please try again.');
    } finally { 
      setNativeBusy(false); 
    }
  };

  const handleManageLimitedAccess = async () => {
    const ids = await showIosLimitedAccessPicker();
    if (ids.length === 0) return;
    // Optional: fetch those contacts and add (left out to keep lean; bulk flow can handle it)
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderImportHistory = () => {
    if (importHistory.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Imports</Text>
        <View style={styles.historyContainer}>
          {importHistory.map((entry, index) => (
            <TouchableOpacity 
              key={entry.id}
              onPress={() => setSelectedHistoryEntry(entry)}
              style={[
                styles.historyItem,
                index < importHistory.length - 1 && styles.historyItemBorder
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.historyLeft}>
                {entry.status === 'success' ? (
                  <CheckCircle size={16} color="#10B981" />
                ) : (
                  <XCircle size={16} color="#EF4444" />
                )}
                <View style={styles.historyText}>
                  <Text style={styles.historyLabel}>
                    {entry.status === 'success' 
                      ? `${entry.imported} contact${entry.imported === 1 ? '' : 's'} imported`
                      : 'Import failed'
                    }
                  </Text>
                  <Text style={styles.historySubtitle}>
                    {formatDate(entry.date)} • {entry.total} total contacts
                  </Text>
                  {entry.error && (
                    <Text style={styles.historyError}>{entry.error}</Text>
                  )}
                </View>
              </View>
              <Info size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.historyHint}>Tap any import to see details</Text>
      </View>
    );
  };

  const renderContent = () => {
    if (sessionState === 'running') {
      return (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.progressTitle}>Importing Contacts</Text>
          <Text style={styles.progressText}>
            Processing {progress.current} of {progress.total} contacts
          </Text>
          <Text style={styles.progressSubtext}>
            {progress.imported} new contacts imported
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }
              ]} 
            />
          </View>
          <TouchableOpacity
            testID="cancelImport"
            style={[styles.secondaryButton, styles.cancelButton]}
            onPress={() => {}}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Users size={48} color="#000000" />
          </View>
          
          <Text style={styles.title}>Import Contacts</Text>
          <Text style={styles.description}>
            Import contacts from your phone{Platform.OS !== 'web' ? ' address book' : ''}. We'll skip duplicates and only add new contacts.
          </Text>

          {/* Permission Status Banner */}
          {deviceSupported && permissionStatus !== 'granted' && sessionState === 'idle' && (
            <View style={[
              styles.permissionBanner,
              permissionStatus === 'denied' ? styles.permissionBannerDenied : styles.permissionBannerUndetermined
            ]}>
              <AlertCircle 
                size={20} 
                color={permissionStatus === 'denied' ? '#EF4444' : '#F59E0B'} 
              />
              <View style={styles.permissionBannerContent}>
                <Text style={styles.permissionBannerTitle}>
                  {permissionStatus === 'denied' 
                    ? 'Contacts Access Denied'
                    : 'Contacts Permission Required'
                  }
                </Text>
                <Text style={styles.permissionBannerText}>
                  {permissionStatus === 'denied'
                    ? 'Enable contacts access in Settings to import from your device and SIM card.'
                    : 'Grant access to your contacts (device + SIM) to get started.'
                  }
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.permissionButton,
                  permissionStatus === 'denied' && styles.permissionButtonDenied
                ]}
                onPress={permissionStatus === 'denied' ? () => Linking.openSettings() : requestPermissions}
              >
                {permissionStatus === 'denied' ? (
                  <Settings size={16} color="#FFFFFF" />
                ) : (
                  <UserPlus size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Web banner when device import is not supported */}
          {!deviceSupported && (
            <View style={[styles.permissionBanner, styles.permissionBannerUndetermined]}> 
              <AlertCircle size={20} color="#F59E0B" />
              <View style={styles.permissionBannerContent}>
                <Text style={styles.permissionBannerTitle}>Phone Contacts Not Available on Web</Text>
                <Text style={styles.permissionBannerText}>Use the mobile app to import from your device. For third-party imports, go to Settings → Import from Third Parties.</Text>
              </View>
            </View>
          )}
          {/* Contact Count Info */}
          {deviceSupported && permissionStatus === 'granted' && contactsCount > 0 && sessionState === 'idle' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                📱 {contactsCount} contact{contactsCount === 1 ? '' : 's'} available to import
                {Platform.OS === 'android' && ' (device + SIM)'}
              </Text>
            </View>
          )}
          {sessionState === 'complete' ? (
            <View style={styles.successContainer}>
              <CheckCircle size={32} color="#10B981" />
              <Text style={styles.successTitle}>Import Complete!</Text>
              <Text style={styles.successText}>
                {progress.imported} new contact{progress.imported === 1 ? '' : 's'} added to your list.
              </Text>
            </View>
          ) : sessionState === 'error' ? (
            <View style={styles.errorContainer}>
              <XCircle size={32} color="#EF4444" />
              <Text style={styles.errorTitle}>Import Failed</Text>
              <Text style={styles.errorText}>
                {Platform.OS === 'web' 
                  ? 'Contact import is not supported on web. Please use the mobile app.'
                  : 'Something went wrong. Please try again.'
                }
              </Text>
            </View>
          ) : null}

          {/* Device Import Section (shown on web as disabled) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Import from Device</Text>
            <TouchableOpacity
              testID="pickOneContact"
              style={[styles.primaryButton, styles.nativeButton, (!deviceSupported || nativeBusy || permissionStatus !== 'granted') && styles.disabledButton]}
              onPress={deviceSupported ? handlePickOne : undefined}
              disabled={!deviceSupported || nativeBusy || permissionStatus !== 'granted'}
            >
              <Text style={[styles.primaryButtonText, !deviceSupported && styles.disabledButtonText]}>
                {!deviceSupported
                  ? 'Pick One Contact (Mobile Only)'
                  : permissionStatus !== 'granted' ? 'Allow Access to Pick Contacts' : 'Pick One Contact'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="pickMultipleContacts"
              style={[styles.secondaryButton, styles.nativeButton, (!deviceSupported || nativeBusy || permissionStatus !== 'granted') && styles.disabledButton]}
              onPress={deviceSupported ? handlePickMultiple : undefined}
              disabled={!deviceSupported || nativeBusy || permissionStatus !== 'granted'}
            >
              <View style={styles.buttonContent}>
                <Users size={20} color={(!deviceSupported || nativeBusy || permissionStatus !== 'granted') ? '#9CA3AF' : '#374151'} />
                <Text style={[styles.secondaryButtonText, (!deviceSupported || nativeBusy || permissionStatus !== 'granted') && styles.disabledButtonText]}>
                  {!deviceSupported ? 'Pick Multiple Contacts (Mobile Only)' : 'Pick Multiple Contacts'}
                </Text>
              </View>
            </TouchableOpacity>

            {Platform.OS === 'ios' && deviceSupported && (
              <TouchableOpacity
                testID="manageLimitedAccess"
                style={styles.secondaryButton}
                onPress={handleManageLimitedAccess}
              >
                <Text style={styles.secondaryButtonText}>Manage Limited Access (iOS 18)</Text>
              </TouchableOpacity>
            )}
          </View>

          {(sessionState === 'complete' || sessionState === 'error') && (
            <TouchableOpacity testID="importDone" style={styles.secondaryButton} onPress={handleDone}>
              <Text style={styles.secondaryButtonText}>Done</Text>
            </TouchableOpacity>
          )}

          {renderImportHistory()}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen 
        options={{
          title: 'Import Contacts',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity testID="importBack" onPress={() => go.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#000000" />
            </TouchableOpacity>
          ),
        }} 
      />
      {renderContent()}

      {/* Import Details Modal */}
      <Modal
        visible={selectedHistoryEntry !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedHistoryEntry(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import Details</Text>
              <TouchableOpacity onPress={() => setSelectedHistoryEntry(null)} style={styles.modalCloseButton}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            {selectedHistoryEntry && (
              <ScrollView 
                style={styles.modalBody} 
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Status Section */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Status</Text>
                  <View style={[
                    styles.modalStatusBadge,
                    selectedHistoryEntry.status === 'success' ? styles.modalStatusSuccess : styles.modalStatusError
                  ]}>
                    {selectedHistoryEntry.status === 'success' ? (
                      <CheckCircle size={18} color="#10B981" />
                    ) : (
                      <XCircle size={18} color="#EF4444" />
                    )}
                    <Text style={[
                      styles.modalStatusText,
                      selectedHistoryEntry.status === 'success' ? styles.modalStatusTextSuccess : styles.modalStatusTextError
                    ]}>
                      {selectedHistoryEntry.status === 'success' ? 'Success' : 'Failed'}
                    </Text>
                  </View>
                </View>

                {/* Summary Section */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Summary</Text>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Total Contacts:</Text>
                    <Text style={styles.modalInfoValue}>{selectedHistoryEntry.total}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Imported:</Text>
                    <Text style={[styles.modalInfoValue, styles.modalInfoValueSuccess]}>
                      {selectedHistoryEntry.imported}
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Skipped/Failed:</Text>
                    <Text style={[styles.modalInfoValue, styles.modalInfoValueError]}>
                      {selectedHistoryEntry.total - selectedHistoryEntry.imported}
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Import Time:</Text>
                    <Text style={styles.modalInfoValue}>{formatDate(selectedHistoryEntry.date)}</Text>
                  </View>
                </View>

                {/* Error Details Section */}
                {selectedHistoryEntry.error && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Error Details</Text>
                    <View style={styles.modalErrorBox}>
                      <AlertCircle size={16} color="#EF4444" />
                      <Text style={styles.modalErrorText}>{selectedHistoryEntry.error}</Text>
                    </View>
                  </View>
                )}

                {/* Diagnostic Info Section */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Diagnostic Information</Text>
                  <View style={styles.modalDiagnosticBox}>
                    <Text style={styles.modalDiagnosticText}>
                      {selectedHistoryEntry.status === 'error'
                        ? '⚠️ This import failed. Common causes:\n\n' +
                          '• Contact missing email or phone number\n' +
                          '• iOS Limited Access restrictions\n' +
                          '• Network connectivity issues\n' +
                          '• Invalid contact data format\n\n' +
                          '💡 Try selecting a contact with visible email/phone information.'
                        : '✅ Import completed successfully!\n\n' +
                          `${selectedHistoryEntry.imported} contact${selectedHistoryEntry.imported === 1 ? '' : 's'} ` +
                          `${selectedHistoryEntry.imported === 1 ? 'was' : 'were'} added to your CRM.`
                      }
                    </Text>
                  </View>
                </View>

                {/* Diagnostic Logs */}
                {selectedHistoryEntry.diagnosticLogs && selectedHistoryEntry.diagnosticLogs.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Diagnostic Logs</Text>
                    <View style={styles.diagnosticLogsContainer}>
                      {selectedHistoryEntry.diagnosticLogs.map((log, index) => (
                        <View key={index} style={[
                          styles.diagnosticLogEntry,
                          log.level === 'error' && styles.diagnosticLogError,
                          log.level === 'warn' && styles.diagnosticLogWarn,
                          log.level === 'info' && styles.diagnosticLogInfo,
                        ]}>
                          <View style={styles.diagnosticLogHeader}>
                            <Text style={[
                              styles.diagnosticLogLevel,
                              log.level === 'error' && styles.diagnosticLogLevelError,
                              log.level === 'warn' && styles.diagnosticLogLevelWarn,
                              log.level === 'info' && styles.diagnosticLogLevelInfo,
                            ]}>
                              {log.level.toUpperCase()}
                            </Text>
                            <Text style={styles.diagnosticLogTime}>
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </Text>
                          </View>
                          <Text style={styles.diagnosticLogMessage}>{log.message}</Text>
                          {log.data && (
                            <Text style={styles.diagnosticLogData}>
                              {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Console Logs Hint */}
                {selectedHistoryEntry.status === 'error' && (!selectedHistoryEntry.diagnosticLogs || selectedHistoryEntry.diagnosticLogs.length === 0) && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>For Developers</Text>
                    <View style={styles.modalConsoleHint}>
                      <Info size={14} color="#6B7280" />
                      <Text style={styles.modalConsoleText}>
                        Check Metro bundler console for detailed logs starting with [mapContactToPerson] and [pickOneNativeContact]
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 4,
  },
  progressSubtext: {
    fontSize: 14,
    color: '#10B981',
    marginBottom: 24,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000000',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 12,
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    minWidth: 200,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 200,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  section: {
    width: '100%',
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999999',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  historyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyItem: {
    padding: 16,
  },
  historyItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  historyText: {
    flex: 1,
  },
  historyLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  historySubtitle: {
    fontSize: 12,
    color: '#666666',
  },
  historyError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  disabledButton: {
    backgroundColor: '#E5E5E5',
  },
  disabledButtonText: {
    color: '#999999',
  },

  cancelButton: {
    marginTop: 8,
  },
  nativeButton: {
    marginTop: 8,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    width: '100%',
  },
  permissionBannerUndetermined: {
    backgroundColor: '#FEF3C7',
  },
  permissionBannerDenied: {
    backgroundColor: '#FEE2E2',
  },
  permissionBannerContent: {
    flex: 1,
  },
  permissionBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  permissionBannerText: {
    fontSize: 12,
    color: '#666666',
  },
  permissionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonDenied: {
    backgroundColor: '#EF4444',
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  historyHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    flexGrow: 0,
    flexShrink: 1,
  },
  modalBodyContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalSection: {
    marginTop: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  modalStatusSuccess: {
    backgroundColor: '#D1FAE5',
  },
  modalStatusError: {
    backgroundColor: '#FEE2E2',
  },
  modalStatusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalStatusTextSuccess: {
    color: '#059669',
  },
  modalStatusTextError: {
    color: '#DC2626',
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  modalInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  modalInfoValueSuccess: {
    color: '#059669',
  },
  modalInfoValueError: {
    color: '#DC2626',
  },
  modalErrorBox: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  modalErrorText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
  },
  modalDiagnosticBox: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalDiagnosticText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  modalConsoleHint: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  modalConsoleText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  // Diagnostic Logs styles
  diagnosticLogsContainer: {
    gap: 8,
  },
  diagnosticLogEntry: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#9CA3AF',
  },
  diagnosticLogError: {
    backgroundColor: '#FEF2F2',
    borderLeftColor: '#DC2626',
  },
  diagnosticLogWarn: {
    backgroundColor: '#FFFBEB',
    borderLeftColor: '#F59E0B',
  },
  diagnosticLogInfo: {
    backgroundColor: '#EFF6FF',
    borderLeftColor: '#3B82F6',
  },
  diagnosticLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  diagnosticLogLevel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  diagnosticLogLevelError: {
    color: '#DC2626',
  },
  diagnosticLogLevelWarn: {
    color: '#D97706',
  },
  diagnosticLogLevelInfo: {
    color: '#2563EB',
  },
  diagnosticLogTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  diagnosticLogMessage: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 4,
  },
  diagnosticLogData: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
});