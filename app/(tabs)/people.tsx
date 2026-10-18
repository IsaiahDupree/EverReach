import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePeople } from "@/providers/PeopleProvider";
import { useWarmth } from "@/providers/WarmthProvider";
import { useAppSettings, type Theme } from "@/providers/AppSettingsProvider";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Search, Plus, MessageSquare } from "lucide-react-native";
import Avatar from "@/components/Avatar";
import CrossPlatformTextInput from "@/components/CrossPlatformTextInput";
import { getWarmthColorFromBand } from "@/lib/imageUpload";
import { useAnalytics } from "@/hooks/useAnalytics";
import analytics from "@/lib/analytics";

type FilterType = 'all' | 'hot' | 'warm' | 'cool' | 'cold';

export default function PeopleScreen() {
  const insets = useSafeAreaInsets();
  const { people, isLoading, refreshPeople } = usePeople();
  const { getWarmth } = useWarmth();
  const { theme } = useAppSettings();
  const { filter: urlFilter } = useLocalSearchParams<{ filter?: string }>();
  const [searchQuery, setSearchQuery] = useState("");

  // Analytics tracking
  const screenAnalytics = useAnalytics('People');
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Debug logging to diagnose empty contacts
  /*
  useEffect(() => {
    console.log('=== PEOPLE PAGE DEBUG ===');
    console.log('Is Loading:', isLoading);
    console.log('People count:', people.length);
    console.log('First 3 people:', people.slice(0, 3));
    console.log('========================');
  }, [isLoading, people]);
  */

  useEffect(() => {
    if (urlFilter && ['all', 'hot', 'warm', 'cool', 'cold'].includes(urlFilter)) {
      setFilter(urlFilter as FilterType);
    }
  }, [urlFilter]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('[PeopleScreen] Screen focused, refreshing people list');
      refreshPeople();
    }, [refreshPeople])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    screenAnalytics.startTimer('people_refresh');
    try {
      await refreshPeople();
      screenAnalytics.endTimer('people_refresh', { success: true });
    } catch (error) {
      console.error('Failed to refresh people:', error);
      screenAnalytics.endTimer('people_refresh', { success: false });
      analytics.errors.occurred(error as Error, 'People');
    } finally {
      setRefreshing(false);
    }
  };

  // Track search when query changes
  useEffect(() => {
    if (searchQuery) {
      const timeoutId = setTimeout(() => {
        analytics.contacts.searched(searchQuery, filteredPeople.length);
      }, 500); // Debounce search tracking
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery]);

  // Track filter changes
  useEffect(() => {
    if (filter !== 'all') {
      screenAnalytics.track('filter_applied', { filter });
    }
  }, [filter]);

  const filteredPeople = people
    .filter(person => {
      const matchesSearch = person.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const warmth = getWarmth(person.id);
      const matchesFilter = filter === 'all' || warmth.band === filter;

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => getWarmth(b.id).score - getWarmth(a.id).score);

  const renderPerson = ({ item }: { item: any }) => {
    const warmth = getWarmth(item.id);
    const tags = item.tags || [];

    // DEBUG: Log avatar data


    return (
      <TouchableOpacity
        style={styles.personCard}
        onPress={() => {
          analytics.contacts.viewed(item.id);
          router.push(`/contact/${item.id}`);
        }}
      >
        <View style={styles.personHeader}>
          <Avatar
            name={item.fullName}
            photoUrl={item.photo_url}
            avatarUrl={item.avatarUrl}
            size={56}
            warmthColor={warmth.color}
            borderWidth={3}
          />
          <View style={styles.personInfo}>
            <Text style={styles.personName}>{item.fullName}</Text>
            {item.company && (
              <Text style={styles.personCompany}>{item.title ? `${item.title} at ${item.company}` : item.company}</Text>
            )}
            {(item.lastInteraction || item.nextTouchAt) && (
              <View style={styles.inlineFooter}>
                {item.lastInteraction && (
                  <Text style={styles.lastInteraction}>
                    Last: {new Date(item.lastInteraction).toLocaleDateString()}
                  </Text>
                )}
                {!item.lastInteraction && (
                  <Text style={styles.lastInteraction}>No interactions yet</Text>
                )}
              </View>
            )}
          </View>
          <View style={styles.personActions}>
            <View style={styles.warmthBadge}>
              <Text style={[styles.warmthScore, { color: warmth.color }]}>{warmth.score}</Text>
            </View>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/(tabs)/chat?threadId=${encodeURIComponent(item.id)}&threadLabel=${encodeURIComponent(item.fullName)}`);
              }}
            >
              <MessageSquare size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {item.tags && item.tags.length > 0 && (
          <View style={styles.tags}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={theme.colors.textSecondary} />
          <CrossPlatformTextInput
            style={styles.searchInput}
            placeholder="Search people, companies, tags..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>
      </View>

      {/* Warmth Filters */}
      <View style={styles.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          style={styles.filterScrollView}
        >
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => {
              setFilter('all');
              screenAnalytics.track('filter_cleared');
            }}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'hot' && styles.filterChipActive]}
            onPress={() => setFilter('hot')}
          >
            <Text style={[styles.filterText, filter === 'hot' && styles.filterTextActive]}>Hot</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'warm' && styles.filterChipActive]}
            onPress={() => setFilter('warm')}
          >
            <Text style={[styles.filterText, filter === 'warm' && styles.filterTextActive]}>Warm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'cool' && styles.filterChipActive]}
            onPress={() => setFilter('cool')}
          >
            <Text style={[styles.filterText, filter === 'cool' && styles.filterTextActive]}>Cool</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'cold' && styles.filterChipActive]}
            onPress={() => setFilter('cold')}
          >
            <Text style={[styles.filterText, filter === 'cold' && styles.filterTextActive]}>Cold</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* People List */}
      {isLoading && people.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : filteredPeople.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No contacts found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery || filter !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first contact to get started'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPeople}
          renderItem={renderPerson}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-contact')}
      >
        <Plus size={24} color={theme.colors.surface} />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  filterScrollView: {
    flex: 1,
  },
  filterScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginRight: 12,
    width: 75, // Fixed width instead of minWidth
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: theme.colors.surface,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  personCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  personInfo: {
    flex: 1,
    marginLeft: 12,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  personCompany: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  warmthBadge: {
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  warmthScore: {
    fontSize: 18,
    fontWeight: '700',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tag: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minHeight: 32,
    justifyContent: 'center',
  },
  tagText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  lastInteraction: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  personActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  messageButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineFooter: {
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});