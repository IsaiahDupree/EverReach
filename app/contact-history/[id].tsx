import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import { useContactHistory, Interaction } from '@/hooks/useContactHistory';
import { InteractionCard } from '@/features/contacts/components/InteractionCards';
import { useAnalytics } from '@/hooks/useAnalytics';
import analytics from '@/lib/analytics';

export default function ContactHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  
  // Analytics tracking
  const screenAnalytics = useAnalytics('ContactHistory');
  
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);

  const {
    interactions,
    loading,
    error,
    refreshing,
    refresh,
    filterByType,
  } = useContactHistory(id);

  const filters = [
    { key: 'all', label: 'All', count: interactions.length },
    { key: 'email', label: 'Emails', count: filterByType('email').length },
    { key: 'sms', label: 'SMS', count: filterByType('sms').length },
    { key: 'note', label: 'Notes', count: filterByType('note').length },
    { key: 'call', label: 'Calls', count: filterByType('call').length },
    { key: 'screenshot', label: 'Screenshots', count: filterByType('screenshot').length },
    { key: 'voice_note', label: 'Voice Notes', count: filterByType('voice_note').length },
    { key: 'meeting', label: 'Meetings', count: filterByType('meeting').length },
  ];

  const getFilteredInteractions = useMemo(() => {
    let filtered = selectedFilter === 'all' ? interactions : filterByType(selectedFilter);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.content?.toLowerCase().includes(query) ||
          item.metadata.subject?.toLowerCase().includes(query) ||
          item.kind.toLowerCase().includes(query)
      );
    }

    return filtered.reduce((acc: Record<string, Interaction[]>, item: Interaction) => {
      const date = new Date(item.occurred_at || item.created_at);
      const dateKey = date.toISOString().split('T')[0];

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(item);
      return acc;
    }, {} as Record<string, Interaction[]>);
  }, [interactions, selectedFilter, searchQuery, filterByType]);

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const sortedDates = Object.keys(getFilteredInteractions).sort((a, b) => b.localeCompare(a));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        {showSearch ? (
          <View style={styles.searchContainer}>
            <Search size={18} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search interactions..."
              placeholderTextColor="#C7C7CC"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={styles.headerTitle}>Contact History</Text>
        )}
        <TouchableOpacity
          style={styles.headerRight}
          onPress={() => {
            if (!showSearch) {
              screenAnalytics.track('history_search_opened', {
                contactId: id,
              });
            }
            setShowSearch(!showSearch);
            if (showSearch) {
              setSearchQuery('');
            }
          }}
        >
          {showSearch ? (
            <X size={20} color="#007AFF" />
          ) : (
            <Search size={20} color="#8E8E93" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              selectedFilter === filter.key && styles.filterChipActive,
            ]}
            onPress={() => {
              screenAnalytics.track('history_filter_changed', {
                contactId: id,
                filter: filter.key,
                previousFilter: selectedFilter,
                resultCount: filter.count,
              });
              setSelectedFilter(filter.key);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === filter.key && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
            {filter.count > 0 && (
              <View
                style={[
                  styles.filterBadge,
                  selectedFilter === filter.key && styles.filterBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterBadgeText,
                    selectedFilter === filter.key && styles.filterBadgeTextActive,
                  ]}
                >
                  {filter.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              screenAnalytics.track('history_refreshed', {
                contactId: id,
                currentFilter: selectedFilter,
              });
              refresh();
            }} 
          />
        }
      >
        {sortedDates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No interactions found</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'all'
                ? 'Start interacting with this contact to see history here'
                : `No ${filters.find((f) => f.key === selectedFilter)?.label.toLowerCase()} found`}
            </Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            <View style={styles.timelineLine} />
            {sortedDates.map((date) => (
              <View key={date} style={styles.dateSection}>
                <View style={styles.dateHeader}>
                  <View style={styles.dateDot} />
                  <Text style={styles.dateText}>{formatDateHeader(date)}</Text>
                </View>
                <View style={styles.interactionsGroup}>
                  {getFilteredInteractions[date].map((interaction: Interaction) => (
                    <InteractionCard key={interaction.id} interaction={interaction} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#000000',
  },
  headerRight: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#000000',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#000000',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  timelineContainer: {
    position: 'relative',
    paddingLeft: 32,
    paddingRight: 16,
    paddingVertical: 16,
  },
  timelineLine: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#E5E5EA',
  },
  dateSection: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateDot: {
    position: 'absolute',
    left: -18,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
  },
  interactionsGroup: {
    gap: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#8E8E93',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
  },
});
