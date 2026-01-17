import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, XCircle, FileText, Plus, Trash2 } from 'lucide-react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { usePeople } from '@/providers/PeopleProvider';
import { apiFetch } from '@/lib/api';

type TestResult = {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration?: number;
  error?: string;
  details?: any;
};

type Note = {
  id: string;
  contact_id: string;
  kind: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export default function NotesTestScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  const { people } = usePeople();
  
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [noteContent, setNoteContent] = useState<string>('');
  const [fetchedNotes, setFetchedNotes] = useState<Note[]>([]);
  const [createdNoteId, setCreatedNoteId] = useState<string>('');

  const styles = createStyles(theme);

  const updateTest = (name: string, updates: Partial<TestResult>) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        return prev.map(t => t.name === name ? { ...t, ...updates } : t);
      }
      return [...prev, { name, status: 'pending', ...updates }];
    });
  };

  const runTest = async (
    name: string,
    testFn: () => Promise<{ success: boolean; error?: string; details?: any }>
  ) => {
    const startTime = Date.now();
    updateTest(name, { status: 'running' });

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      if (result.success) {
        updateTest(name, {
          status: 'passed',
          duration,
          details: result.details,
        });
      } else {
        updateTest(name, {
          status: 'failed',
          duration,
          error: result.error || 'Test failed',
          details: result.details,
        });
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTest(name, {
        status: 'failed',
        duration,
        error: error.message || String(error),
      });
    }
  };

  const testCreateNote = async () => {
    if (!selectedContactId) {
      return { success: false, error: 'No contact selected' };
    }

    if (!noteContent.trim()) {
      return { success: false, error: 'Note content is empty' };
    }

    try {
      console.log(`[Notes Test] Creating note for contact ${selectedContactId}`);
      console.log(`[Notes Test] Note content: "${noteContent}"`);

      const response = await apiFetch(`/api/v1/contacts/${selectedContactId}/notes`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          content: noteContent,
          metadata: {
            source: 'notes-test-page',
            timestamp: new Date().toISOString(),
          },
        }),
      });

      console.log(`[Notes Test] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Notes Test] Error response:`, errorText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
          details: { status: response.status, body: errorText },
        };
      }

      const result = await response.json();
      console.log(`[Notes Test] Success response:`, result);

      const note = result.note || result;
      setCreatedNoteId(note.id);

      return {
        success: true,
        details: {
          noteId: note.id,
          contactId: note.contact_id,
          createdAt: note.created_at,
        },
      };
    } catch (error: any) {
      console.error(`[Notes Test] Exception:`, error);
      return {
        success: false,
        error: error.message || String(error),
      };
    }
  };

  const testFetchNotes = async () => {
    if (!selectedContactId) {
      return { success: false, error: 'No contact selected' };
    }

    try {
      console.log(`[Notes Test] Fetching notes for contact ${selectedContactId}`);

      const response = await apiFetch(`/api/v1/contacts/${selectedContactId}/notes`, {
        method: 'GET',
        requireAuth: true,
      });

      console.log(`[Notes Test] Fetch response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Notes Test] Fetch error:`, errorText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const result = await response.json();
      console.log(`[Notes Test] Fetched notes:`, result);

      const notes = result.items || result.notes || result || [];
      setFetchedNotes(notes);

      return {
        success: true,
        details: {
          count: notes.length,
          notes: notes.slice(0, 3).map((n: Note) => ({
            id: n.id,
            content: n.content?.substring(0, 50),
            created_at: n.created_at,
          })),
        },
      };
    } catch (error: any) {
      console.error(`[Notes Test] Fetch exception:`, error);
      return {
        success: false,
        error: error.message || String(error),
      };
    }
  };

  const testUpdateNote = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!createdNoteId) {
      console.log(`[Notes Test] No createdNoteId available for update`);
      return { success: false, error: 'No note created yet to update', duration: 0 };
    }

    try {
      console.log(`[Notes Test] Updating note ${createdNoteId}`);

      const updatedContent = `${noteContent} [UPDATED at ${new Date().toLocaleTimeString()}]`;

      const response = await apiFetch(`/api/v1/interactions/${createdNoteId}`, {
        method: 'PUT',
        requireAuth: true,
        body: JSON.stringify({
          content: updatedContent,
        }),
      });

      console.log(`[Notes Test] Update response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Notes Test] Update error:`, errorText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const result = await response.json();
      console.log(`[Notes Test] Update success:`, result);

      return {
        success: true,
        details: {
          noteId: createdNoteId,
          updatedContent: updatedContent.substring(0, 50),
        },
      };
    } catch (error: any) {
      console.error(`[Notes Test] Update exception:`, error);
      return {
        success: false,
        error: error.message || String(error),
      };
    }
  };

  const testDeleteNote = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!createdNoteId) {
      console.log(`[Notes Test] No createdNoteId available for deletion`);
      return { success: false, error: 'No note created yet to delete', duration: 0 };
    }

    try {
      console.log(`[Notes Test] Deleting note ${createdNoteId}`);

      const noteIdToDelete = createdNoteId;
      const response = await apiFetch(`/api/v1/interactions/${noteIdToDelete}`, {
        method: 'DELETE',
        requireAuth: true,
      });

      console.log(`[Notes Test] Delete response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Notes Test] Delete error:`, errorText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      setCreatedNoteId('');

      return {
        success: true,
        details: {
          deletedNoteId: noteIdToDelete,
        },
      };
    } catch (error: any) {
      console.error(`[Notes Test] Delete exception:`, error);
      return {
        success: false,
        error: error.message || String(error),
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTests([]);
    setCreatedNoteId('');

    await runTest('Create Note', testCreateNote);
    await new Promise(resolve => setTimeout(resolve, 500));

    await runTest('Fetch Notes', testFetchNotes);
    await new Promise(resolve => setTimeout(resolve, 500));

    await runTest('Update Note', testUpdateNote);
    await new Promise(resolve => setTimeout(resolve, 500));

    await runTest('Fetch Notes Again', testFetchNotes);
    await new Promise(resolve => setTimeout(resolve, 500));

    await runTest('Delete Note', testDeleteNote);
    await new Promise(resolve => setTimeout(resolve, 500));

    await runTest('Verify Deletion', testFetchNotes);

    setIsRunning(false);
  };

  const passedCount = tests.filter(t => t.status === 'passed').length;
  const failedCount = tests.filter(t => t.status === 'failed').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'Notes API Tests',
          headerShown: true,
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <FileText size={32} color={theme.colors.primary} />
          <Text style={styles.title}>Contact Notes Tests</Text>
          <Text style={styles.subtitle}>
            Test creating, fetching, updating, and deleting notes
          </Text>
        </View>

        {/* Contact Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Select Contact</Text>
          <View style={styles.card}>
            {people.length === 0 ? (
              <Text style={styles.noContactsText}>
                No contacts available. Please add contacts first.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {people.slice(0, 10).map(person => (
                  <TouchableOpacity
                    key={person.id}
                    style={[
                      styles.contactChip,
                      selectedContactId === person.id && styles.contactChipSelected,
                    ]}
                    onPress={() => setSelectedContactId(person.id)}
                  >
                    <Text
                      style={[
                        styles.contactChipText,
                        selectedContactId === person.id && styles.contactChipTextSelected,
                      ]}
                    >
                      {person.name || person.fullName || 'Unnamed'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {selectedContactId && (
              <Text style={styles.selectedContactText}>
                Selected: {people.find(p => p.id === selectedContactId)?.name || selectedContactId}
              </Text>
            )}
          </View>
        </View>

        {/* Note Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Enter Note Content</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter note content..."
              placeholderTextColor={theme.colors.textSecondary}
              value={noteContent}
              onChangeText={setNoteContent}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Run Tests Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.runButton,
              (!selectedContactId || !noteContent.trim() || isRunning) && styles.runButtonDisabled,
            ]}
            onPress={runAllTests}
            disabled={!selectedContactId || !noteContent.trim() || isRunning}
          >
            {isRunning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.runButtonText}>Run All Tests</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Test Results */}
        {tests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Results</Text>
            <View style={styles.card}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  {passedCount} Passed • {failedCount} Failed • {tests.length} Total
                </Text>
              </View>

              {tests.map((test, index) => (
                <View key={index} style={styles.testResult}>
                  <View style={styles.testHeader}>
                    <View style={styles.testLeft}>
                      {test.status === 'running' ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : test.status === 'passed' ? (
                        <CheckCircle2 size={20} color={theme.colors.success} />
                      ) : test.status === 'failed' ? (
                        <XCircle size={20} color={theme.colors.error} />
                      ) : null}
                      <Text style={styles.testName}>{test.name}</Text>
                    </View>
                    {test.duration && (
                      <Text style={styles.testDuration}>{test.duration}ms</Text>
                    )}
                  </View>

                  {test.error && (
                    <Text style={styles.testError}>{test.error}</Text>
                  )}

                  {test.details && (
                    <View style={styles.testDetails}>
                      <Text style={styles.testDetailsText}>
                        {JSON.stringify(test.details, null, 2)}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Fetched Notes Display */}
        {fetchedNotes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fetched Notes ({fetchedNotes.length})</Text>
            <View style={styles.card}>
              {fetchedNotes.map((note, index) => (
                <View key={note.id} style={styles.noteItem}>
                  <Text style={styles.noteContent}>{note.content}</Text>
                  <Text style={styles.noteTimestamp}>
                    {new Date(note.created_at).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Individual Test Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Individual Tests</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.individualButton, !selectedContactId && styles.individualButtonDisabled]}
              onPress={() => runTest('Create Note', testCreateNote)}
              disabled={!selectedContactId || isRunning}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.individualButtonText}>Create Note</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.individualButton, !selectedContactId && styles.individualButtonDisabled]}
              onPress={() => runTest('Fetch Notes', testFetchNotes)}
              disabled={!selectedContactId || isRunning}
            >
              <FileText size={20} color="#fff" />
              <Text style={styles.individualButtonText}>Fetch Notes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.individualButton, !createdNoteId && styles.individualButtonDisabled]}
              onPress={() => runTest('Update Note', testUpdateNote)}
              disabled={!createdNoteId || isRunning}
            >
              <FileText size={20} color="#fff" />
              <Text style={styles.individualButtonText}>Update Note</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.individualButton, !createdNoteId && styles.individualButtonDisabled]}
              onPress={() => runTest('Delete Note', testDeleteNote)}
              disabled={!createdNoteId || isRunning}
            >
              <Trash2 size={20} color="#fff" />
              <Text style={styles.individualButtonText}>Delete Note</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      alignItems: 'center',
      padding: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginTop: 12,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    section: {
      marginBottom: 24,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
    },
    noContactsText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      padding: 16,
    },
    contactChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      marginRight: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    contactChipSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    contactChipText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    contactChipTextSelected: {
      color: '#fff',
      fontWeight: '600',
    },
    selectedContactText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 12,
    },
    textInput: {
      fontSize: 14,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    runButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
    },
    runButtonDisabled: {
      backgroundColor: theme.colors.border,
      opacity: 0.5,
    },
    runButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    summaryRow: {
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginBottom: 16,
    },
    summaryText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    testResult: {
      marginBottom: 16,
    },
    testHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    testLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    testName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    testDuration: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    testError: {
      fontSize: 12,
      color: theme.colors.error,
      marginTop: 4,
      marginLeft: 28,
    },
    testDetails: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
      marginLeft: 28,
    },
    testDetailsText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontFamily: 'monospace',
    },
    noteItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    noteContent: {
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: 4,
    },
    noteTimestamp: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    individualButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 8,
    },
    individualButtonDisabled: {
      backgroundColor: theme.colors.border,
      opacity: 0.5,
    },
    individualButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
  });
