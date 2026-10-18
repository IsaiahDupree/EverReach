/**
 * APP-KIT: Main Screen (Home Tab)
 * 
 * 🔧 REPLACE THIS ENTIRE SCREEN WITH YOUR CORE FEATURE
 * 
 * This is a placeholder list view. Replace it with your main app feature.
 * 
 * Examples:
 * - E-commerce: Product grid
 * - Social: Feed of posts
 * - Fitness: Today's workout
 * - Task Manager: Task list
 * 
 * ✅ KEEP: Navigation structure, hooks pattern, loading states
 * 🔧 REPLACE: Item list with your core feature UI
 */
import { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  StyleSheet 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';
import { useItems } from '@/hooks/useItems';
import { useSubscription } from '@/hooks/useSubscription';
import { APP_CONFIG } from '@/constants/config';
import { Item } from '@/types/models';

// ============================================
// 🔧 DEV MODE: Customization hint overlay
// ============================================
function DevHint() {
  if (!APP_CONFIG.DEV_MODE) return null;
  
  return (
    <View style={styles.devHint}>
      <Text style={styles.devHintText}>
        🔧 APP-KIT: Replace this list with your core feature
      </Text>
      <Text style={styles.devHintFile}>
        File: app/(tabs)/index.tsx
      </Text>
    </View>
  );
}

// ============================================
// 🔧 REPLACE: Item card component
// ============================================
function ItemCard({ item, onPress }: { item: Item; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* TODO: Replace with your item display */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        {item.description && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================
// 🔧 REPLACE: Empty state component
// ============================================
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No items yet</Text>
      <Text style={styles.emptyDescription}>
        {/* TODO: Replace with your empty state message */}
        Tap the + button to create your first item
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onAdd}>
        <Text style={styles.emptyButtonText}>Create Item</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// Main Screen Component
// ============================================
export default function HomeScreen() {
  const router = useRouter();
  const { data, isLoading, refetch } = useItems();
  const { isPro } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);

  const items = data?.data || [];
  const freeLimit = APP_CONFIG.SUBSCRIPTION.FREE_TIER_LIMITS.items;
  const isAtLimit = !isPro && items.length >= freeLimit;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAddItem = () => {
    if (isAtLimit) {
      // Show upgrade prompt
      router.push('/paywall');
    } else {
      router.push('/create-item');
    }
  };

  const handleItemPress = (item: Item) => {
    router.push(`/item/${item.id}`);
  };

  return (
    <View style={styles.container}>
      {/* Dev Mode Hint */}
      <DevHint />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {/* TODO: Replace with your screen title */}
          My Items
        </Text>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => router.push('/search')}
        >
          <Search color="#6B7280" size={24} />
        </TouchableOpacity>
      </View>

      {/* Free tier limit warning */}
      {!isPro && items.length > 0 && (
        <View style={styles.limitBanner}>
          <Text style={styles.limitText}>
            {items.length} / {freeLimit} items used
          </Text>
          <TouchableOpacity onPress={() => router.push('/paywall')}>
            <Text style={styles.upgradeLink}>Upgrade →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Item List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ItemCard item={item} onPress={() => handleItemPress(item)} />
        )}
        ListEmptyComponent={
          !isLoading ? <EmptyState onAdd={handleAddItem} /> : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={items.length === 0 && styles.emptyList}
      />

      {/* FAB */}
      <TouchableOpacity 
        style={[styles.fab, isAtLimit && styles.fabDisabled]}
        onPress={handleAddItem}
      >
        <Plus color="white" size={24} />
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// 🔧 CUSTOMIZE: Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  devHint: {
    backgroundColor: '#8B5CF6',
    padding: 12,
  },
  devHintText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  devHintFile: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  searchButton: {
    padding: 8,
  },
  limitBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  limitText: {
    color: '#92400E',
    fontSize: 14,
  },
  upgradeLink: {
    color: '#B45309',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#4B5563',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabDisabled: {
    backgroundColor: '#9CA3AF',
  },
});
