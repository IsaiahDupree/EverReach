/**
 * Search Screen
 * Feature: IOS-NAV-004
 *
 * Search screen with filtering capability that includes:
 * - Search input field
 * - Debounced search functionality
 * - Results list display
 * - Empty state handling
 *
 * Acceptance Criteria:
 * - Search input
 * - Results list
 * - Debounced search
 *
 * CUSTOMIZATION GUIDE:
 * To adapt this screen for your app:
 * 1. Replace the Item type with your entity (e.g., Product, Post, etc.)
 * 2. Update the search logic to match your data fields
 * 3. Connect to your actual data source (replace mock data)
 * 4. Customize the debounce delay (default: 300ms)
 * 5. Update the renderItem function to show your data
 * 6. Add navigation to detail screen on item press
 *
 * @module app/(tabs)/search
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
 * CUSTOMIZATION: Replace with actual data fetching
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
  {
    id: '3',
    title: 'Example Product',
    description: 'This is an example product for testing search',
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'Test Entry',
    description: 'Testing the search functionality',
    created_at: new Date().toISOString(),
  },
  {
    id: '5',
    title: 'Demo Content',
    description: 'Demo content for search results',
    created_at: new Date().toISOString(),
  },
];

/**
 * Debounce delay in milliseconds
 * CUSTOMIZATION: Adjust based on your needs (lower = more responsive, higher = fewer searches)
 */
const DEBOUNCE_DELAY = 300;

/**
 * Search Screen Component
 *
 * Provides a search interface with debounced filtering of items.
 * Users can type in the search field and see real-time filtered results.
 *
 * @example
 * ```tsx
 * // This screen is automatically rendered at the /search tab route
 * // Users can navigate here from the tab bar
 * ```
 */
export default function SearchScreen() {
  const router = useRouter();

  // State management
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [allItems] = useState<Item[]>(MOCK_ITEMS); // CUSTOMIZATION: Replace with data hook

  /**
   * Debounce the search query
   * This prevents excessive filtering on every keystroke
   */
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setIsSearching(false);
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  /**
   * Filter items based on debounced search query
   * CUSTOMIZATION: Update the search logic to match your data structure
   */
  useEffect(() => {
    if (debouncedQuery.trim() === '') {
      setFilteredItems([]);
      return;
    }

    const query = debouncedQuery.toLowerCase();
    const results = allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
    );

    setFilteredItems(results);
  }, [debouncedQuery, allItems]);

  /**
   * Handle search input changes
   */
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  /**
   * Clear search input
   */
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    setFilteredItems([]);
    Keyboard.dismiss();
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
   * Render individual item in the search results
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
   * Empty state component - shown when no search query entered
   */
  const renderEmptyStart = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>Search Items</Text>
      <Text style={styles.emptyDescription}>
        Enter a keyword to search through items
      </Text>
    </View>
  );

  /**
   * No results component - shown when search returns no results
   */
  const renderNoResults = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="file-tray-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No results found</Text>
      <Text style={styles.emptyDescription}>
        Try searching with different keywords
      </Text>
    </View>
  );

  /**
   * Loading indicator during search
   */
  const renderSearching = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color="#007AFF" />
      <Text style={styles.loadingText}>Searching...</Text>
    </View>
  );

  /**
   * Determine which empty state to show
   */
  const renderEmptyState = () => {
    if (isSearching) {
      return renderSearching();
    }
    if (searchQuery.trim() === '') {
      return renderEmptyStart();
    }
    return renderNoResults();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons
            name="search"
            size={20}
            color="#8E8E93"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="never"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results List */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          (filteredItems.length === 0 || isSearching) && styles.emptyListContainer,
        ]}
        ListEmptyComponent={renderEmptyState}
        keyboardShouldPersistTaps="handled"
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
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
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
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666666',
  },
});
