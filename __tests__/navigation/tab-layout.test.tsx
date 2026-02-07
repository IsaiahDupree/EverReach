/**
 * Tab Navigation Tests
 * Feature: IOS-NAV-002
 *
 * Tests for the bottom tab navigation component with Home, Search, and Settings tabs.
 *
 * Acceptance Criteria:
 * - Tabs render correctly
 * - Icons display properly
 * - Active state works
 */

import * as fs from 'fs';
import * as path from 'path';

describe('IOS-NAV-002: Tab Navigation', () => {
  const tabLayoutPath = path.resolve(__dirname, '../../app/(tabs)/_layout.tsx');

  describe('Tab Layout File', () => {
    test('should have (tabs)/_layout.tsx file', () => {
      expect(fs.existsSync(tabLayoutPath)).toBe(true);
    });

    test('should export a default component', () => {
      if (fs.existsSync(tabLayoutPath)) {
        const content = fs.readFileSync(tabLayoutPath, 'utf-8');
        expect(content).toContain('export default');
      }
    });
  });

  describe('Tab Structure', () => {
    test('should have Home tab configuration', () => {
      if (fs.existsSync(tabLayoutPath)) {
        const content = fs.readFileSync(tabLayoutPath, 'utf-8');
        // Check for home/index tab
        expect(content.toLowerCase()).toMatch(/home|index/);
      }
    });

    test('should have Search tab configuration', () => {
      if (fs.existsSync(tabLayoutPath)) {
        const content = fs.readFileSync(tabLayoutPath, 'utf-8');
        expect(content.toLowerCase()).toContain('search');
      }
    });

    test('should have Settings tab configuration', () => {
      if (fs.existsSync(tabLayoutPath)) {
        const content = fs.readFileSync(tabLayoutPath, 'utf-8');
        expect(content.toLowerCase()).toContain('settings');
      }
    });
  });

  describe('Icons', () => {
    test('should have icon imports or usage', () => {
      if (fs.existsSync(tabLayoutPath)) {
        const content = fs.readFileSync(tabLayoutPath, 'utf-8');
        // Check for common icon library usage
        const hasIcons =
          content.includes('@expo/vector-icons') ||
          content.includes('Icon') ||
          content.includes('tabBarIcon');
        expect(hasIcons).toBe(true);
      }
    });
  });

  describe('Active State', () => {
    test('should handle active tab state', () => {
      if (fs.existsSync(tabLayoutPath)) {
        const content = fs.readFileSync(tabLayoutPath, 'utf-8');
        // Should have logic for showing active state (focused/color)
        const hasActiveState =
          content.includes('focused') ||
          content.includes('color');
        expect(hasActiveState).toBe(true);
      }
    });
  });

  describe('Expo Router Integration', () => {
    test('should use Tabs component from expo-router', () => {
      if (fs.existsSync(tabLayoutPath)) {
        const content = fs.readFileSync(tabLayoutPath, 'utf-8');
        expect(content).toContain('expo-router');
        expect(content).toContain('Tabs');
      }
    });
  });
});
