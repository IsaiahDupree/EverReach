/**
 * ItemCard Component
 * Feature: IOS-COMP-004
 *
 * A card component for displaying item information in a list.
 * Tappable to navigate to item detail screen.
 *
 * Features:
 * - Displays item name, description, status, and category
 * - Tappable to navigate to detail screen
 * - Uses Card component for consistent styling
 * - Handles missing optional fields gracefully
 * - Full accessibility support
 *
 * @module components/items/ItemCard
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import Card from '../common/Card';
import { Item } from '../../types/item';

/**
 * ItemCard Component Props
 */
export interface ItemCardProps {
  /**
   * Item data to display
   */
  item: Item;

  /**
   * Test ID for testing
   */
  testID?: string;

  /**
   * Additional custom styles
   */
  style?: ViewStyle;
}

/**
 * ItemCard Component
 *
 * Displays item information in a card format with navigation to detail screen.
 *
 * @example
 * ```tsx
 * <ItemCard
 *   item={{
 *     id: '123',
 *     name: 'My Item',
 *     description: 'Item description',
 *     status: ItemStatus.ACTIVE,
 *     category: ItemCategory.GENERAL,
 *     user_id: 'user-1',
 *     created_at: '2024-01-01',
 *   }}
 * />
 * ```
 */
export default function ItemCard({
  item,
  testID,
  style,
}: ItemCardProps) {
  const router = useRouter();

  /**
   * Handle card press - navigate to item detail screen
   */
  const handlePress = () => {
    router.push(`/item/${item.id}`);
  };

  /**
   * Format status for display (capitalize first letter)
   */
  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  /**
   * Format category for display (capitalize first letter)
   */
  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  };

  /**
   * Generate accessibility label
   */
  const accessibilityLabel = `${item.name}, ${item.status} status${
    item.category ? `, ${item.category} category` : ''
  }${item.description ? `, ${item.description}` : ''}`;

  return (
    <TouchableOpacity
      onPress={handlePress}
      testID={testID}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to view item details"
      activeOpacity={0.7}
      style={style}
    >
      <Card style={styles.card}>
        <View style={styles.content}>
          {/* Item Name */}
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Item Description */}
          {item.description && (
            <Text style={styles.description} numberOfLines={3}>
              {item.description}
            </Text>
          )}

          {/* Status and Category Row */}
          <View style={styles.metaRow}>
            {/* Status Badge */}
            <View style={[styles.badge, styles.statusBadge]}>
              <Text style={styles.badgeText}>
                {formatStatus(item.status)}
              </Text>
            </View>

            {/* Category Badge */}
            {item.category && (
              <View style={[styles.badge, styles.categoryBadge]}>
                <Text style={styles.badgeText}>
                  {formatCategory(item.category)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  content: {
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadge: {
    backgroundColor: '#e8f5e9',
  },
  categoryBadge: {
    backgroundColor: '#e3f2fd',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
});
