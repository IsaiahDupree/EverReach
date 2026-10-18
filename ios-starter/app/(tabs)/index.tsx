/**
 * Home Screen (Items List)
 * Feature: IOS-NAV-003
 *
 * Main list screen that displays generic items with:
 * - Pull to refresh functionality
 * - Empty state handling
 * - Loading states
 *
 * Acceptance Criteria:
 * - Shows items in a list
 * - Pull to refresh works
 * - Empty state displays when no items
 *
 * CUSTOMIZATION GUIDE:
 * To adapt this screen for your app:
 * 1. Replace the Item type with your entity (e.g., Product, Post, etc.)
 * 2. Update the renderItem function to show your data
 * 3. Connect to your actual data hook (replace mock data)
 * 4. Customize the empty state message
 * 5. Add navigation to detail screen on item press
 *
 * @module app/(tabs)/index
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Generic Item interface
 * CUSTOMIZATION: Replace this with your actual entity type
 */
interface Item {
  id: string;
  title: string;
  description?: string;
  created_at: string;
}

/**
 * Mock data for demonstration
 * CUSTOMIZATION: Replace with actual data fetching hook
 */
const MOCK_ITEMS: Item[] = [
  {
    id: '1',
    title: 'Sample Item 1',
    description: 'This is a sample item for demonstration',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Sample Item 2',
    description: 'Another sample item',
    created_at: new Date().toISOString(),
  },
];

/**
 * Home Screen Component
 *
 * Displays a list of items with pull-to-refresh and empty state.
 *
 * @example
 * ```tsx
 * // This screen is automatically rendered at the root tab route "/"
 * // Users can navigate here from other tabs
 * ```
 */
export default function HomeScreen() {
  const router = useRouter();

  // State management
  const [items, setItems] = useState<Item[]>(MOCK_ITEMS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  /**
   * Handle pull-to-refresh
   * CUSTOMIZATION: Replace with actual data refresh logic
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // CUSTOMIZATION: Replace with actual data fetching
      // Example: const { data } = await refetch();
      // setItems(data);

      console.log('Items refreshed');
    } catch (error) {
      console.error('Error refreshing items:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  /**
   * Navigate to item detail screen
   * CUSTOMIZATION: Update the route path if you renamed the detail screen
   */
  const handleItemPress = (itemId: string) => {
    // CUSTOMIZATION: Replace with your detail route
    // router.push(`/item/${itemId}`);
    console.log('Item pressed:', itemId);
  };

  /**
   * Render individual item in the list
   * CUSTOMIZATION: Update this to display your entity's data
   */
  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => handleItemPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text style={styles.itemDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  /**
   * Empty state component
   * CUSTOMIZATION: Update the message and icon for your app
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No items yet</Text>
      <Text style={styles.emptyDescription}>
        Get started by adding your first item
      </Text>
    </View>
  );

  /**
   * Loading state component
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading items...</Text>
    </View>
  );

  // Show loading state on initial load
  if (isLoading && items.length === 0) {
    return <View style={styles.container}>{renderLoadingState()}</View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Home</Text>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          items.length === 0 && styles.emptyListContainer,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

/**
 * Styles
 * CUSTOMIZATION: Update colors and spacing to match your brand
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000000',
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemContent: {
    gap: 8,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  itemDate: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
});
