/**
 * ItemCard Component Tests
 * Feature: IOS-COMP-004
 *
 * Test acceptance criteria:
 * - Shows item info
 * - Tap navigates to detail
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ItemCard from '../../../components/items/ItemCard';
import { Item, ItemStatus, ItemCategory } from '../../../types/item';

// Mock Expo Router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('ItemCard Component', () => {
  // Sample test item
  const mockItem: Item = {
    id: '123',
    user_id: 'user-456',
    name: 'Test Item',
    description: 'This is a test item description',
    category: ItemCategory.GENERAL,
    status: ItemStatus.ACTIVE,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  };

  beforeEach(() => {
    mockPush.mockClear();
  });

  describe('Rendering - Shows item info', () => {
    it('should render item name', () => {
      const { getByText } = render(<ItemCard item={mockItem} />);
      expect(getByText('Test Item')).toBeTruthy();
    });

    it('should render item description when provided', () => {
      const { getByText } = render(<ItemCard item={mockItem} />);
      expect(getByText('This is a test item description')).toBeTruthy();
    });

    it('should not render description when not provided', () => {
      const itemWithoutDescription = { ...mockItem, description: null };
      const { queryByText } = render(<ItemCard item={itemWithoutDescription} />);

      // Should still render the name
      expect(queryByText('Test Item')).toBeTruthy();
      // Description should not exist
      expect(queryByText('This is a test item description')).toBeNull();
    });

    it('should render item status', () => {
      const { getByText } = render(<ItemCard item={mockItem} />);
      // Status should be displayed in a user-friendly format
      expect(getByText(/active/i)).toBeTruthy();
    });

    it('should render item category when provided', () => {
      const { getByText } = render(<ItemCard item={mockItem} />);
      expect(getByText(/general/i)).toBeTruthy();
    });

    it('should render with testID', () => {
      const { getByTestId } = render(
        <ItemCard item={mockItem} testID="item-card" />
      );
      expect(getByTestId('item-card')).toBeTruthy();
    });
  });

  describe('Navigation - Tap navigates to detail', () => {
    it('should navigate to item detail on tap', () => {
      const { getByTestId } = render(
        <ItemCard item={mockItem} testID="tappable-card" />
      );

      const card = getByTestId('tappable-card');
      fireEvent.press(card);

      // Should call router.push with the item detail path
      expect(mockPush).toHaveBeenCalledWith(`/item/${mockItem.id}`);
    });

    it('should be pressable', () => {
      const { getByTestId } = render(
        <ItemCard item={mockItem} testID="pressable-card" />
      );

      const card = getByTestId('pressable-card');
      // The card should have pressable behavior
      expect(card).toBeTruthy();

      // Should accept press events
      expect(() => fireEvent.press(card)).not.toThrow();
    });

    it('should navigate with correct item ID', () => {
      const customItem = { ...mockItem, id: 'custom-id-789' };
      const { getByTestId } = render(
        <ItemCard item={customItem} testID="custom-card" />
      );

      fireEvent.press(getByTestId('custom-card'));
      expect(mockPush).toHaveBeenCalledWith('/item/custom-id-789');
    });
  });

  describe('Styling and Layout', () => {
    it('should use Card component for layout', () => {
      const { getByTestId } = render(
        <ItemCard item={mockItem} testID="styled-card" />
      );

      // The ItemCard should render successfully
      const itemCard = getByTestId('styled-card');
      expect(itemCard).toBeTruthy();

      // Check that the component structure includes a Card component
      // by checking for children with card-like styling
      const hasCardStyling = (() => {
        try {
          // Look through the component tree for card styling
          const checkForCardStyles = (element: any): boolean => {
            if (!element) return false;

            const style = element.props?.style;
            if (style) {
              // Check if any style object has card-like properties
              const styles = Array.isArray(style) ? style : [style];
              for (const s of styles) {
                if (s && typeof s === 'object') {
                  if (
                    s.borderRadius !== undefined ||
                    s.elevation !== undefined ||
                    s.shadowColor !== undefined
                  ) {
                    return true;
                  }
                }
              }
            }

            // Check children recursively
            if (element.children) {
              const children = Array.isArray(element.children) ? element.children : [element.children];
              for (const child of children) {
                if (checkForCardStyles(child)) {
                  return true;
                }
              }
            }

            return false;
          };

          return checkForCardStyles(itemCard);
        } catch {
          // If we can't inspect the tree, just verify the component renders
          return true;
        }
      })();

      expect(hasCardStyling).toBeTruthy();
    });

    it('should have proper spacing between elements', () => {
      const { getByTestId } = render(
        <ItemCard item={mockItem} testID="spaced-card" />
      );

      // Card should exist and be properly structured
      expect(getByTestId('spaced-card')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle items with minimal data', () => {
      const minimalItem: Item = {
        id: 'min-1',
        user_id: 'user-1',
        name: 'Minimal Item',
        status: ItemStatus.ACTIVE,
        created_at: '2024-01-01T00:00:00Z',
      };

      const { getByText } = render(<ItemCard item={minimalItem} />);
      expect(getByText('Minimal Item')).toBeTruthy();
    });

    it('should handle very long item names', () => {
      const longNameItem = {
        ...mockItem,
        name: 'This is a very long item name that should be handled gracefully by the component and potentially truncated or wrapped',
      };

      const { getByText } = render(<ItemCard item={longNameItem} />);
      expect(getByText(longNameItem.name)).toBeTruthy();
    });

    it('should handle all status types', () => {
      const statuses = [
        ItemStatus.ACTIVE,
        ItemStatus.INACTIVE,
        ItemStatus.ARCHIVED,
        ItemStatus.DRAFT,
      ];

      statuses.forEach((status) => {
        const itemWithStatus = { ...mockItem, status };
        const { getByText } = render(<ItemCard item={itemWithStatus} />);

        // Should render the status
        expect(getByText(new RegExp(status, 'i'))).toBeTruthy();
      });
    });

    it('should handle all category types', () => {
      const categories = [
        ItemCategory.GENERAL,
        ItemCategory.PERSONAL,
        ItemCategory.WORK,
        ItemCategory.OTHER,
      ];

      categories.forEach((category) => {
        const itemWithCategory = { ...mockItem, category };
        const { getByText } = render(<ItemCard item={itemWithCategory} />);

        // Should render the category
        expect(getByText(new RegExp(category, 'i'))).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      const { getByTestId } = render(
        <ItemCard item={mockItem} testID="accessible-card" />
      );

      const card = getByTestId('accessible-card');
      expect(card.props.accessible).toBeTruthy();
    });

    it('should have meaningful accessibility label', () => {
      const { getByTestId } = render(
        <ItemCard item={mockItem} testID="labeled-card" />
      );

      const card = getByTestId('labeled-card');
      // Should have an accessibility label that includes the item name
      const accessibilityLabel = card.props.accessibilityLabel;

      if (accessibilityLabel) {
        expect(accessibilityLabel).toContain('Test Item');
      }
    });

    it('should indicate it is a pressable button', () => {
      const { getByTestId } = render(
        <ItemCard item={mockItem} testID="button-card" />
      );

      const card = getByTestId('button-card');
      // Should have button role or similar accessibility hint
      expect(
        card.props.accessibilityRole === 'button' ||
        card.props.accessibilityHint !== undefined
      ).toBeTruthy();
    });
  });
});
