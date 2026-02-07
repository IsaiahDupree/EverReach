/**
 * Color Constants Tests
 * Feature: IOS-THEME-002
 *
 * Tests for color palette definitions following TDD approach.
 * These tests verify that light, dark, and brand color palettes are properly defined.
 */

import { Colors, LightColors, DarkColors, BrandColors } from '../../constants/colors';

describe('Color Constants', () => {
  describe('BrandColors', () => {
    it('should define primary brand color', () => {
      expect(BrandColors.primary).toBeDefined();
      expect(typeof BrandColors.primary).toBe('string');
      expect(BrandColors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define secondary brand color', () => {
      expect(BrandColors.secondary).toBeDefined();
      expect(typeof BrandColors.secondary).toBe('string');
      expect(BrandColors.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define accent brand color', () => {
      expect(BrandColors.accent).toBeDefined();
      expect(typeof BrandColors.accent).toBe('string');
      expect(BrandColors.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define success color', () => {
      expect(BrandColors.success).toBeDefined();
      expect(typeof BrandColors.success).toBe('string');
      expect(BrandColors.success).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define warning color', () => {
      expect(BrandColors.warning).toBeDefined();
      expect(typeof BrandColors.warning).toBe('string');
      expect(BrandColors.warning).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define error color', () => {
      expect(BrandColors.error).toBeDefined();
      expect(typeof BrandColors.error).toBe('string');
      expect(BrandColors.error).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define info color', () => {
      expect(BrandColors.info).toBeDefined();
      expect(typeof BrandColors.info).toBe('string');
      expect(BrandColors.info).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('LightColors', () => {
    it('should define background color', () => {
      expect(LightColors.background).toBeDefined();
      expect(typeof LightColors.background).toBe('string');
      expect(LightColors.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define foreground/surface color', () => {
      expect(LightColors.foreground).toBeDefined();
      expect(typeof LightColors.foreground).toBe('string');
      expect(LightColors.foreground).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define primary text color', () => {
      expect(LightColors.text).toBeDefined();
      expect(typeof LightColors.text).toBe('string');
      expect(LightColors.text).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define secondary text color', () => {
      expect(LightColors.textSecondary).toBeDefined();
      expect(typeof LightColors.textSecondary).toBe('string');
      expect(LightColors.textSecondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define tertiary text color', () => {
      expect(LightColors.textTertiary).toBeDefined();
      expect(typeof LightColors.textTertiary).toBe('string');
      expect(LightColors.textTertiary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define border color', () => {
      expect(LightColors.border).toBeDefined();
      expect(typeof LightColors.border).toBe('string');
      expect(LightColors.border).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define separator color', () => {
      expect(LightColors.separator).toBeDefined();
      expect(typeof LightColors.separator).toBe('string');
      expect(LightColors.separator).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define shadow color', () => {
      expect(LightColors.shadow).toBeDefined();
      expect(typeof LightColors.shadow).toBe('string');
      expect(LightColors.shadow).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define card background color', () => {
      expect(LightColors.card).toBeDefined();
      expect(typeof LightColors.card).toBe('string');
      expect(LightColors.card).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('DarkColors', () => {
    it('should define background color', () => {
      expect(DarkColors.background).toBeDefined();
      expect(typeof DarkColors.background).toBe('string');
      expect(DarkColors.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define foreground/surface color', () => {
      expect(DarkColors.foreground).toBeDefined();
      expect(typeof DarkColors.foreground).toBe('string');
      expect(DarkColors.foreground).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define primary text color', () => {
      expect(DarkColors.text).toBeDefined();
      expect(typeof DarkColors.text).toBe('string');
      expect(DarkColors.text).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define secondary text color', () => {
      expect(DarkColors.textSecondary).toBeDefined();
      expect(typeof DarkColors.textSecondary).toBe('string');
      expect(DarkColors.textSecondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define tertiary text color', () => {
      expect(DarkColors.textTertiary).toBeDefined();
      expect(typeof DarkColors.textTertiary).toBe('string');
      expect(DarkColors.textTertiary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define border color', () => {
      expect(DarkColors.border).toBeDefined();
      expect(typeof DarkColors.border).toBe('string');
      expect(DarkColors.border).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define separator color', () => {
      expect(DarkColors.separator).toBeDefined();
      expect(typeof DarkColors.separator).toBe('string');
      expect(DarkColors.separator).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define shadow color', () => {
      expect(DarkColors.shadow).toBeDefined();
      expect(typeof DarkColors.shadow).toBe('string');
      expect(DarkColors.shadow).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should define card background color', () => {
      expect(DarkColors.card).toBeDefined();
      expect(typeof DarkColors.card).toBe('string');
      expect(DarkColors.card).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('Colors object', () => {
    it('should export light colors under light key', () => {
      expect(Colors.light).toBeDefined();
      expect(Colors.light).toBe(LightColors);
    });

    it('should export dark colors under dark key', () => {
      expect(Colors.dark).toBeDefined();
      expect(Colors.dark).toBe(DarkColors);
    });

    it('should export brand colors under brand key', () => {
      expect(Colors.brand).toBeDefined();
      expect(Colors.brand).toBe(BrandColors);
    });
  });

  describe('Color contrast validation', () => {
    it('should have lighter background than foreground in light mode', () => {
      // Light mode: background should be lighter (closer to #FFFFFF)
      const bgValue = parseInt(LightColors.background.slice(1), 16);
      const fgValue = parseInt(LightColors.foreground.slice(1), 16);
      expect(bgValue).toBeGreaterThan(fgValue);
    });

    it('should have darker background than foreground in dark mode', () => {
      // Dark mode: background should be darker (closer to #000000)
      const bgValue = parseInt(DarkColors.background.slice(1), 16);
      const fgValue = parseInt(DarkColors.foreground.slice(1), 16);
      expect(bgValue).toBeLessThan(fgValue);
    });

    it('should have light text in dark mode', () => {
      // Dark mode text should be light (high value)
      const textValue = parseInt(DarkColors.text.slice(1), 16);
      expect(textValue).toBeGreaterThan(0xAAAAAA); // Reasonably light
    });

    it('should have dark text in light mode', () => {
      // Light mode text should be dark (low value)
      const textValue = parseInt(LightColors.text.slice(1), 16);
      expect(textValue).toBeLessThan(0x555555); // Reasonably dark
    });
  });

  describe('Color completeness', () => {
    it('should have matching properties in light and dark color objects', () => {
      const lightKeys = Object.keys(LightColors).sort();
      const darkKeys = Object.keys(DarkColors).sort();
      expect(lightKeys).toEqual(darkKeys);
    });

    it('should export all required brand colors', () => {
      const brandKeys = Object.keys(BrandColors).sort();
      const expectedKeys = ['accent', 'error', 'info', 'primary', 'secondary', 'success', 'warning'].sort();
      expect(brandKeys).toEqual(expectedKeys);
    });

    it('should export all required light/dark colors', () => {
      const requiredKeys = [
        'background',
        'foreground',
        'text',
        'textSecondary',
        'textTertiary',
        'border',
        'separator',
        'shadow',
        'card',
      ].sort();

      const lightKeys = Object.keys(LightColors).sort();
      const darkKeys = Object.keys(DarkColors).sort();

      expect(lightKeys).toEqual(requiredKeys);
      expect(darkKeys).toEqual(requiredKeys);
    });
  });
});
