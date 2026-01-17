import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { go } from '@/lib/navigation';
import { ArrowLeft, Search, CheckSquare, Square, Users } from 'lucide-react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { apiFetch } from '@/lib/api';
import { useAnalytics } from '@/hooks/useAnalytics';

type PreviewContact = {
  id: string;
  external_id: string;
  display_name: string;
  given_name: string;
  family_name: string;
  emails: string[];
  phones: string[];
  organization?: string;
  job_title?: string;
};

type JobInfo = {
  job_id: string;
  provider: string;
  total_contacts: number;
  contacts: PreviewContact[];
};

export default function ImportContactsReviewScreen() {
  const { theme } = useAppSettings();
  const params = useLocalSearchParams<{ job_id: string }>();
  const screenAnalytics = useAnalytics('ImportContactsReview');

  const [loading, setLoading] = useState(true);
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await apiFetch(
        `/api/v1/contacts/import/jobs/${params.job_id}/preview`,
        { requireAuth: true }
      );

      if (!response.ok) {
        throw new Error('Failed to load contacts');
      }

      const data = await response.json();
      setJobInfo(data);

      // Select all by default
      setSelectedIds(new Set(data.contacts.map((c: PreviewContact) => c.id)));

      screenAnalytics.track('contacts_loaded', {
        provider: data.provider,
        total_contacts: data.total_contacts,
      });
    } catch (error) {
      console.error('[ImportContactsReview] Load error:', error);
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
      go.back();
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!jobInfo) return [];
    if (!searchQuery) return jobInfo.contacts;

    const query = searchQuery.toLowerCase();
    return jobInfo.contacts.filter(
      (c) =>
        c.display_name?.toLowerCase().includes(query) ||
        c.emails.some((e) => e.toLowerCase().includes(query)) ||
        c.phones.some((p) => p.includes(query)) ||
        c.organization?.toLowerCase().includes(query)
    );
  }, [jobInfo, searchQuery]);

  const toggleContact = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }

    screenAnalytics.track('toggle_all_contacts', {
      action: selectedIds.size === filteredContacts.length ? 'deselect' : 'select',
    });
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      Alert.alert(
        'No Contacts Selected',
        'Please select at least one contact to import.'
      );
      return;
    }

    setImporting(true);

    try {
      const response = await apiFetch(
        `/api/v1/contacts/import/jobs/${params.job_id}/confirm`,
        {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({
            contact_ids: Array.from(selectedIds),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();

      screenAnalytics.track('import_confirmed', {
        provider: jobInfo?.provider,
        selected_count: selectedIds.size,
        imported_count: result.imported_contacts,
        skipped_count: result.skipped_contacts,
      });

      Alert.alert(
        'Import Complete!',
        `Successfully imported ${result.imported_contacts} contact${
          result.imported_contacts !== 1 ? 's' : ''
        }${result.skipped_contacts > 0 ? ` (${result.skipped_contacts} skipped)` : ''}.`,
        [
          {
            text: 'OK',
            onPress: () => go.replaceTo('/(tabs)/contacts'),
          },
        ]
      );
    } catch (error) {
      console.error('[ImportContactsReview] Import error:', error);
      Alert.alert('Error', 'Failed to import contacts. Please try again.');
      setImporting(false);
    }
  };

  const renderContact = ({ item }: { item: PreviewContact }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.contactCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
        onPress={() => toggleContact(item.id)}
      >
        <View style={styles.checkbox}>
          {isSelected ? (
            <CheckSquare size={24} color={theme.colors.primary} />
          ) : (
            <Square size={24} color={theme.colors.textSecondary} />
          )}
        </View>

        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { color: theme.colors.text }]}>
            {item.display_name || 'No Name'}
          </Text>

          {item.emails.length > 0 && (
            <Text
              style={[styles.contactDetail, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              📧 {item.emails[0]}
            </Text>
          )}

          {item.phones.length > 0 && (
            <Text
              style={[styles.contactDetail, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              📱 {item.phones[0]}
            </Text>
          )}

          {item.organization && (
            <Text
              style={[styles.contactDetail, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              🏢 {item.organization}
              {item.job_title && ` · ${item.job_title}`}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!jobInfo) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <Stack.Screen
        options={{
          title: `Select Contacts`,
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => go.back()}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Search Bar */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <Search size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Search contacts..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Toolbar */}
      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity style={styles.selectAllButton} onPress={toggleAll}>
          <Text
            style={[styles.selectAllText, { color: theme.colors.primary }]}
          >
            {selectedIds.size === filteredContacts.length
              ? 'Deselect All'
              : 'Select All'}
          </Text>
        </TouchableOpacity>

        <View style={styles.countContainer}>
          <Users size={16} color={theme.colors.textSecondary} />
          <Text
            style={[styles.selectedCount, { color: theme.colors.textSecondary }]}
          >
            {selectedIds.size} of {jobInfo.total_contacts} selected
          </Text>
        </View>
      </View>

      {/* Contact List */}
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        renderItem={renderContact}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {searchQuery
                ? 'No contacts match your search'
                : 'No contacts found'}
            </Text>
          </View>
        }
      />

      {/* Import Button */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.importButton,
            {
              backgroundColor:
                selectedIds.size > 0
                  ? theme.colors.primary
                  : theme.colors.border,
            },
          ]}
          onPress={handleImport}
          disabled={importing || selectedIds.size === 0}
        >
          {importing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.importButtonText}>
              Import {selectedIds.size} Contact
              {selectedIds.size !== 1 ? 's' : ''}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  selectAllButton: {
    padding: 4,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedCount: {
    fontSize: 14,
  },
  list: {
    padding: 16,
  },
  contactCard: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  checkbox: {
    marginRight: 12,
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 14,
    marginBottom: 2,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  importButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
