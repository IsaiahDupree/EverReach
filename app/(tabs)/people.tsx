import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePeople } from "@/providers/PeopleProvider";
import { useAppSettings, type Theme } from "@/providers/AppSettingsProvider";
import { router, useLocalSearchParams } from "expo-router";
import { Search, Plus, MessageSquare } from "lucide-react-native";

type FilterType = 'all' | 'hot' | 'warm' | 'cool' | 'cold';

export default function PeopleScreen() {
  const insets = useSafeAreaInsets();
  const { people, getWarmthStatus, getWarmthScore } = usePeople();
  const { theme } = useAppSettings();
  const { filter: urlFilter } = useLocalSearchParams<{ filter?: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (urlFilter && ['all', 'hot', 'warm', 'cool', 'cold'].includes(urlFilter)) {
      setFilter(urlFilter as FilterType);
    }
  }, [urlFilter]);

  const filteredPeople = people
    .filter(person => {
      const matchesSearch = person.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = filter === 'all' || getWarmthStatus(person.id) === filter;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => getWarmthScore(b.id) - getWarmthScore(a.id));

  const getWarmthColor = (status: string) => {
    switch (status) {
      case 'hot': return '#4ECDC4';
      case 'warm': return '#FFD93D';
      case 'cool': return '#95E1D3';
      case 'cold': return '#FF6B6B';
      default: return '#999999';
    }
  };

  const renderPerson = ({ item }: { item: typeof people[0] }) => {
    const warmthStatus = getWarmthStatus(item.id);
    const warmthColor = getWarmthColor(warmthStatus);

    return (
      <TouchableOpacity
        style={styles.personCard}
        onPress={() => router.push(`/contact/${item.id}`)}
      >
        <View style={styles.personHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.fullName.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.personInfo}>
            <Text style={styles.personName}>{item.fullName}</Text>
            {item.company && (
              <Text style={styles.personCompany}>{item.title ? `${item.title} at ${item.company}` : item.company}</Text>
            )}
          </View>
          <View style={styles.personActions}>
            <TouchableOpacity 
              style={styles.messageButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/(tabs)/chat?threadId=${encodeURIComponent(item.id)}&threadLabel=${encodeURIComponent(item.fullName)}`);
              }}
            >
              <MessageSquare size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <View style={[styles.warmthIndicator, { backgroundColor: warmthColor }]} />
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
        <View style={styles.personFooter}>
          <Text style={styles.lastInteraction}>
            {item.lastInteraction 
              ? `Last: ${new Date(item.lastInteraction).toLocaleDateString()}`
              : 'No interactions yet'}
          </Text>
          {item.nextTouchAt && (
            <Text style={styles.nextTouch}>
              Next: {new Date(item.nextTouchAt).toLocaleDateString()}
            </Text>
          )}
        </View>
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
          <TextInput
            style={styles.searchInput}
            placeholder="Search people, companies, tags..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
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
      </View>

      {/* People List */}
      <FlatList
        data={filteredPeople}
        renderItem={renderPerson}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    marginBottom: 12,
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
  warmthIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  personFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lastInteraction: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  nextTouch: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  personActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
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
});