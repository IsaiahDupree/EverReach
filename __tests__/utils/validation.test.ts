/**
 * Tests for Input Validation Utility
 * Feature: BACK-UTIL-004
 */

import { z } from 'zod';
import { validateInput, formatZodErrors } from '../../lib/utils/validation';

describe('Input Validation Utility', () => {
  describe('validateInput', () => {
    it('should validate valid input successfully', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(0),
      });

      const input = { email: 'test@example.com', age: 25 };
      const result = validateInput(schema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(input);
      }
    });

    it('should return validation errors for invalid input', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(0),
      });

      const input = { email: 'invalid-email', age: -5 };
      const result = validateInput(schema, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should handle missing required fields', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      const input = { name: '' };
      const result = validateInput(schema, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should strip unknown fields when using strict schemas', () => {
      const schema = z.object({
        name: z.string(),
      }).strict();

      const input = { name: 'John', extraField: 'should be removed' };
      const result = validateInput(schema, input);

      expect(result.success).toBe(false);
    });
  });

  describe('formatZodErrors', () => {
    it('should format Zod errors into readable error messages', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      const result = schema.safeParse({ email: 'invalid', age: 10 });

      if (!result.success) {
        const formatted = formatZodErrors(result.error);

        expect(formatted).toHaveProperty('errors');
        expect(Array.isArray(formatted.errors)).toBe(true);
        expect(formatted.errors.length).toBeGreaterThan(0);

        // Check that each error has field and message
        formatted.errors.forEach((error: any) => {
          expect(error).toHaveProperty('field');
          expect(error).toHaveProperty('message');
        });
      }
    });

    it('should handle nested object errors', () => {
      const schema = z.object({
        user: z.object({
          name: z.string().min(1),
          email: z.string().email(),
        }),
      });

      const result = schema.safeParse({ user: { name: '', email: 'bad' } });

      if (!result.success) {
        const formatted = formatZodErrors(result.error);

        expect(formatted.errors.length).toBeGreaterThan(0);

        // Check for nested paths
        const hasNestedPath = formatted.errors.some((e: any) =>
          e.field.includes('user.')
        );
        expect(hasNestedPath).toBe(true);
      }
    });

    it('should return user-friendly error messages', () => {
      const schema = z.object({
        password: z.string().min(8),
      });

      const result = schema.safeParse({ password: '123' });

      if (!result.success) {
        const formatted = formatZodErrors(result.error);

        expect(formatted.errors[0]).toHaveProperty('message');
        expect(typeof formatted.errors[0].message).toBe('string');
        expect(formatted.errors[0].message.length).toBeGreaterThan(0);
      }
    });
  });
});
