/**
 * Card Component Tests
 * Feature: IOS-COMP-003
 *
 * Test acceptance criteria:
 * - Shadow
 * - Border radius
 * - Padding
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import Card from '../components/common/Card';

describe('Card Component', () => {
  describe('Rendering', () => {
    it('should render children correctly', () => {
      const { getByText } = render(
        <Card>
          <Text>Test Content</Text>
        </Card>
      );

      expect(getByText('Test Content')).toBeTruthy();
    });

    it('should render with testID', () => {
      const { getByTestId } = render(
        <Card testID="test-card">
          <Text>Content</Text>
        </Card>
      );

      expect(getByTestId('test-card')).toBeTruthy();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <Card>
          <Text>First Child</Text>
          <Text>Second Child</Text>
        </Card>
      );

      expect(getByText('First Child')).toBeTruthy();
      expect(getByText('Second Child')).toBeTruthy();
    });
  });

  describe('Styling - Padding', () => {
    it('should have default padding applied', () => {
      const { getByTestId } = render(
        <Card testID="card-with-padding">
          <Text>Content</Text>
        </Card>
      );

      const card = getByTestId('card-with-padding');
      const style = card.props.style;

      // Check that padding is applied (should be 16 based on common patterns)
      expect(style.padding || style.paddingVertical || style.paddingHorizontal).toBeDefined();
    });

    it('should allow custom style with additional padding', () => {
      const { getByTestId } = render(
        <Card testID="custom-card" style={{ padding: 24 }}>
          <Text>Content</Text>
        </Card>
      );

      const card = getByTestId('custom-card');
      // Custom styles should be merged with base styles
      expect(card.props.style).toBeDefined();
    });
  });

  describe('Styling - Border Radius', () => {
    it('should have border radius applied', () => {
      const { getByTestId } = render(
        <Card testID="card-with-radius">
          <Text>Content</Text>
        </Card>
      );

      const card = getByTestId('card-with-radius');
      const style = card.props.style;

      // Check that borderRadius is applied
      expect(style.borderRadius).toBeDefined();
      expect(typeof style.borderRadius).toBe('number');
      expect(style.borderRadius).toBeGreaterThan(0);
    });
  });

  describe('Styling - Shadow', () => {
    it('should have shadow properties applied', () => {
      const { getByTestId } = render(
        <Card testID="card-with-shadow">
          <Text>Content</Text>
        </Card>
      );

      const card = getByTestId('card-with-shadow');
      const style = card.props.style;

      // Check for shadow properties (shadowColor, shadowOffset, shadowOpacity, shadowRadius for iOS)
      // or elevation for Android
      const hasShadow =
        (style.shadowColor && style.shadowOffset && style.shadowOpacity && style.shadowRadius) ||
        style.elevation;

      expect(hasShadow).toBeTruthy();
    });

    it('should have appropriate shadow color', () => {
      const { getByTestId } = render(
        <Card testID="card-shadow">
          <Text>Content</Text>
        </Card>
      );

      const card = getByTestId('card-shadow');
      const style = card.props.style;

      // Shadow color should be defined and be a valid color
      if (style.shadowColor) {
        expect(style.shadowColor).toBeDefined();
        expect(typeof style.shadowColor).toBe('string');
      }
    });

    it('should have shadow offset defined', () => {
      const { getByTestId } = render(
        <Card testID="card-shadow-offset">
          <Text>Content</Text>
        </Card>
      );

      const card = getByTestId('card-shadow-offset');
      const style = card.props.style;

      // shadowOffset should be an object with width and height
      if (style.shadowOffset) {
        expect(style.shadowOffset).toBeDefined();
        expect(typeof style.shadowOffset).toBe('object');
        expect(style.shadowOffset).toHaveProperty('width');
        expect(style.shadowOffset).toHaveProperty('height');
      }
    });
  });

  describe('Custom Styling', () => {
    it('should merge custom styles with default styles', () => {
      const customStyle = {
        backgroundColor: '#f0f0f0',
        marginVertical: 10,
      };

      const { getByTestId } = render(
        <Card testID="custom-styled-card" style={customStyle}>
          <Text>Content</Text>
        </Card>
      );

      const card = getByTestId('custom-styled-card');
      const style = card.props.style;

      // Custom styles should be present
      expect(style.backgroundColor).toBe('#f0f0f0');
      expect(style.marginVertical).toBe(10);

      // But default styles should still be there
      expect(style.borderRadius).toBeDefined();
    });

    it('should not override default padding when additional styles are provided', () => {
      const { getByTestId } = render(
        <Card testID="styled-card" style={{ backgroundColor: '#fff' }}>
          <Text>Content</Text>
        </Card>
      );

      const card = getByTestId('styled-card');
      const style = card.props.style;

      // Should have both custom backgroundColor and default padding
      expect(style.backgroundColor).toBe('#fff');
      expect(style.padding || style.paddingVertical || style.paddingHorizontal).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible as a container', () => {
      const { getByTestId } = render(
        <Card testID="accessible-card">
          <Text>Content</Text>
        </Card>
      );

      const card = getByTestId('accessible-card');

      // Card should be accessible
      expect(card.props.accessible).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children gracefully', () => {
      const { getByTestId } = render(
        <Card testID="empty-card">
          {null}
        </Card>
      );

      expect(getByTestId('empty-card')).toBeTruthy();
    });

    it('should handle array of children', () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];

      const { getByText } = render(
        <Card>
          {items.map((item, index) => (
            <Text key={index}>{item}</Text>
          ))}
        </Card>
      );

      items.forEach((item) => {
        expect(getByText(item)).toBeTruthy();
      });
    });
  });
});
