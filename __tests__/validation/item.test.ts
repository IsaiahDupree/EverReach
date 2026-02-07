/**
 * Tests for Item Validation Schemas
 * Feature: BACK-UTIL-004
 */

import {
  CreateItemSchema,
  UpdateItemSchema,
  ListItemsParamsSchema,
} from '../../lib/validation/item';

describe('Item Validation Schemas', () => {
  describe('CreateItemSchema', () => {
    it('should validate a valid item creation request', () => {
      const validInput = {
        title: 'My New Item',
        description: 'This is a test item',
      };

      const result = CreateItemSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(validInput.title);
        expect(result.data.description).toBe(validInput.description);
      }
    });

    it('should allow optional description', () => {
      const validInput = {
        title: 'Item without description',
      };

      const result = CreateItemSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(validInput.title);
      }
    });

    it('should reject empty title', () => {
      const invalidInput = {
        title: '',
        description: 'Valid description',
      };

      const result = CreateItemSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('should reject title that is too long', () => {
      const invalidInput = {
        title: 'a'.repeat(501), // Assuming max 500 chars
        description: 'Valid description',
      };

      const result = CreateItemSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('should reject missing title', () => {
      const invalidInput = {
        description: 'Description without title',
      };

      const result = CreateItemSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('should trim whitespace from title', () => {
      const validInput = {
        title: '  Trimmed Title  ',
        description: 'Description',
      };

      const result = CreateItemSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Trimmed Title');
      }
    });

    it('should reject description that is too long', () => {
      const invalidInput = {
        title: 'Valid title',
        description: 'a'.repeat(5001), // Assuming max 5000 chars
      };

      const result = CreateItemSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });
  });

  describe('UpdateItemSchema', () => {
    it('should validate a complete update request', () => {
      const validInput = {
        title: 'Updated Title',
        description: 'Updated description',
      };

      const result = UpdateItemSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(validInput.title);
        expect(result.data.description).toBe(validInput.description);
      }
    });

    it('should allow partial updates (only title)', () => {
      const validInput = {
        title: 'Only updating title',
      };

      const result = UpdateItemSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(validInput.title);
        expect(result.data.description).toBeUndefined();
      }
    });

    it('should allow partial updates (only description)', () => {
      const validInput = {
        description: 'Only updating description',
      };

      const result = UpdateItemSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe(validInput.description);
        expect(result.data.title).toBeUndefined();
      }
    });

    it('should allow setting description to null', () => {
      const validInput = {
        description: null,
      };

      const result = UpdateItemSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeNull();
      }
    });

    it('should reject empty title', () => {
      const invalidInput = {
        title: '',
      };

      const result = UpdateItemSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('should reject empty updates', () => {
      const invalidInput = {};

      const result = UpdateItemSchema.safeParse(invalidInput);

      // Should succeed but refine should catch it
      // Or we should require at least one field
      expect(result.success).toBe(false);
    });
  });

  describe('ListItemsParamsSchema', () => {
    it('should validate default pagination params', () => {
      const validInput = {};

      const result = ListItemsParamsSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(10);
        expect(result.data.sortBy).toBe('created_at');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should validate custom pagination params', () => {
      const validInput = {
        page: 2,
        pageSize: 20,
        sortBy: 'title',
        sortOrder: 'asc',
      };

      const result = ListItemsParamsSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.pageSize).toBe(20);
        expect(result.data.sortBy).toBe('title');
        expect(result.data.sortOrder).toBe('asc');
      }
    });

    it('should reject page less than 1', () => {
      const invalidInput = {
        page: 0,
      };

      const result = ListItemsParamsSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('should reject negative page numbers', () => {
      const invalidInput = {
        page: -5,
      };

      const result = ListItemsParamsSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('should reject pageSize less than 1', () => {
      const invalidInput = {
        pageSize: 0,
      };

      const result = ListItemsParamsSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('should reject pageSize greater than max (100)', () => {
      const invalidInput = {
        pageSize: 101,
      };

      const result = ListItemsParamsSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('should reject invalid sortBy field', () => {
      const invalidInput = {
        sortBy: 'invalid_field',
      };

      const result = ListItemsParamsSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('should reject invalid sortOrder', () => {
      const invalidInput = {
        sortOrder: 'invalid',
      };

      const result = ListItemsParamsSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('should coerce string numbers to integers', () => {
      const validInput = {
        page: '3',
        pageSize: '25',
      };

      const result = ListItemsParamsSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.pageSize).toBe(25);
        expect(typeof result.data.page).toBe('number');
        expect(typeof result.data.pageSize).toBe('number');
      }
    });
  });
});
