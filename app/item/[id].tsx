/**
 * Item Detail Screen
 * Feature: IOS-NAV-006
 *
 * Detail screen for viewing a single item with:
 * - Dynamic routing by item ID
 * - Edit and delete actions
 * - Loading and error states
 *
 * Acceptance Criteria:
 * - Loads item by ID from route params
 * - Displays item details
 * - Edit action available
 * - Delete action with confirmation
 *
 * CUSTOMIZATION GUIDE:
 * To adapt this screen for your app:
 * 1. Replace the Item type with your entity type
 * 2. Update the data fetching logic to load your entity
 * 3. Customize the displayed fields
 * 4. Implement actual edit functionality
 * 5. Connect delete action to your backend
 * 6. Add any additional actions specific to your entity
 *
 * @module app/item/[id]
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

/**
 * Generic Item interface
 * CUSTOMIZATION: Replace this with your actual entity type
 */
interface Item {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Mock item data
 * CUSTOMIZATION: Replace with actual data fetching
 */
const MOCK_ITEMS: Record<string, Item> = {
  '1': {
    id: '1',
    title: 'Sample Item 1',
    description: 'This is a detailed description of the first sample item. It contains more information than what is displayed in the list view.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  '2': {
    id: '2',
    title: 'Sample Item 2',
    description: 'Another sample item with detailed information that can be viewed and edited.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

/**
 * Item Detail Screen Component
 *
 * Displays full details of a single item with edit/delete actions.
 *
 * @example
 * ```tsx
 * // Navigate to this screen from a list:
 * router.push(`/item/${itemId}`);
 * ```
 */
export default function ItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const itemId = params.id as string;

  // State management
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load item data
   * CUSTOMIZATION: Replace with actual API call or database query
   */
  useEffect(() => {
    const loadItem = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // CUSTOMIZATION: Replace with actual data fetching
        // Example: const { data, error } = await supabase
        //   .from('items')
        //   .select('*')
        //   .eq('id', itemId)
        //   .single();

        const foundItem = MOCK_ITEMS[itemId];

        if (!foundItem) {
          setError('Item not found');
        } else {
          setItem(foundItem);
        }
      } catch (err) {
        console.error('Error loading item:', err);
        setError('Failed to load item');
      } finally {
        setIsLoading(false);
      }
    };

    if (itemId) {
      loadItem();
    }
  }, [itemId]);

  /**
   * Handle edit action
   * CUSTOMIZATION: Implement your edit logic
   * Options:
   * - Navigate to an edit screen
   * - Open a modal with edit form
   * - Toggle inline editing mode
   */
  const handleEdit = () => {
    // CUSTOMIZATION: Replace with your edit navigation
    // router.push(`/item/${itemId}/edit`);
    console.log('Edit item:', itemId);
    Alert.alert(
      'Edit Item',
      'This is where you would implement edit functionality. Navigate to an edit screen or show an edit modal.',
      [{ text: 'OK' }]
    );
  };

  /**
   * Handle delete action
   * CUSTOMIZATION: Connect to your backend delete endpoint
   */
  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // CUSTOMIZATION: Replace with actual delete API call
              // Example: await supabase
              //   .from('items')
              //   .delete()
              //   .eq('id', itemId);

              console.log('Deleting item:', itemId);

              // Navigate back after successful delete
              router.back();

              // Show success feedback
              Alert.alert('Success', 'Item deleted successfully');
            } catch (err) {
              console.error('Error deleting item:', err);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading item...</Text>
        </View>
      </View>
    );
  }

  /**
   * Error state
   */
  if (error || !item) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>
            {error || 'Item not found'}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /**
   * Main content with item details
   */
  return (
    <View style={styles.container}>
      {/* Header with actions */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Text style={styles.headerButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleEdit}
          >
            <Text style={styles.headerButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Item content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Title</Text>
          <Text style={styles.title}>{item.title}</Text>
        </View>

        {/* Description */}
        {item.description && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Details</Text>
          <View style={styles.metadataContainer}>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataKey}>ID:</Text>
              <Text style={styles.metadataValue}>{item.id}</Text>
            </View>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataKey}>Created:</Text>
              <Text style={styles.metadataValue}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
            {item.updated_at && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataKey}>Updated:</Text>
                <Text style={styles.metadataValue}>
                  {new Date(item.updated_at).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* CUSTOMIZATION: Add more sections for your entity's fields */}
        {/* Example:
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Custom Field</Text>
          <Text style={styles.fieldValue}>{item.customField}</Text>
        </View>
        */}
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    // Additional styling for delete button
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    lineHeight: 34,
  },
  description: {
    fontSize: 16,
    color: '#3C3C43',
    lineHeight: 24,
  },
  metadataContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  metadataKey: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  metadataValue: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
