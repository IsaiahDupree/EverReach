/**
 * Item Type Tests
 * Feature: IOS-DATA-001
 *
 * Tests for Item type definitions following TDD approach.
 * These tests verify that the generic Item entity types are properly defined.
 */

import {
  Item,
  ItemStatus,
  ItemInput,
  ItemUpdateInput,
  ItemCategory,
} from '../../types/item';

describe('Item Types', () => {
  describe('ItemStatus enum', () => {
    it('should define ACTIVE status', () => {
      expect(ItemStatus.ACTIVE).toBe('active');
    });

    it('should define INACTIVE status', () => {
      expect(ItemStatus.INACTIVE).toBe('inactive');
    });

    it('should define ARCHIVED status', () => {
      expect(ItemStatus.ARCHIVED).toBe('archived');
    });

    it('should define DRAFT status', () => {
      expect(ItemStatus.DRAFT).toBe('draft');
    });
  });

  describe('ItemCategory enum', () => {
    it('should define GENERAL category', () => {
      expect(ItemCategory.GENERAL).toBe('general');
    });

    it('should define PERSONAL category', () => {
      expect(ItemCategory.PERSONAL).toBe('personal');
    });

    it('should define WORK category', () => {
      expect(ItemCategory.WORK).toBe('work');
    });

    it('should define OTHER category', () => {
      expect(ItemCategory.OTHER).toBe('other');
    });
  });

  describe('Item interface', () => {
    it('should accept a valid Item object with all required fields', () => {
      const item: Item = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '987fcdeb-51a2-43d7-9876-543210987654',
        name: 'Test Item',
        description: 'A test item description',
        category: ItemCategory.GENERAL,
        status: ItemStatus.ACTIVE,
        metadata: { key: 'value' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      expect(item.id).toBeDefined();
      expect(item.user_id).toBeDefined();
      expect(item.name).toBeDefined();
      expect(item.created_at).toBeDefined();
    });

    it('should accept an Item with minimal required fields', () => {
      const item: Item = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '987fcdeb-51a2-43d7-9876-543210987654',
        name: 'Minimal Item',
        status: ItemStatus.ACTIVE,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(item.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(item.name).toBe('Minimal Item');
    });

    it('should accept an Item with optional fields as undefined', () => {
      const item: Item = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '987fcdeb-51a2-43d7-9876-543210987654',
        name: 'Item without optionals',
        status: ItemStatus.ACTIVE,
        description: undefined,
        category: undefined,
        metadata: undefined,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: undefined,
      };

      expect(item.description).toBeUndefined();
      expect(item.category).toBeUndefined();
    });
  });

  describe('ItemInput interface', () => {
    it('should accept a valid ItemInput for creating a new item', () => {
      const input: ItemInput = {
        name: 'New Item',
        description: 'Description of new item',
        category: ItemCategory.WORK,
        status: ItemStatus.DRAFT,
        metadata: { custom: 'field' },
      };

      expect(input.name).toBe('New Item');
      expect(input.category).toBe(ItemCategory.WORK);
    });

    it('should accept ItemInput with only required name field', () => {
      const input: ItemInput = {
        name: 'Minimal Input',
      };

      expect(input.name).toBe('Minimal Input');
      expect(input.description).toBeUndefined();
    });

    it('should accept ItemInput with optional fields', () => {
      const input: ItemInput = {
        name: 'Item with optionals',
        description: 'Optional description',
        status: ItemStatus.ACTIVE,
      };

      expect(input.name).toBeDefined();
      expect(input.description).toBeDefined();
      expect(input.status).toBe(ItemStatus.ACTIVE);
    });
  });

  describe('ItemUpdateInput interface', () => {
    it('should accept a valid ItemUpdateInput with all fields', () => {
      const update: ItemUpdateInput = {
        name: 'Updated Name',
        description: 'Updated description',
        category: ItemCategory.PERSONAL,
        status: ItemStatus.ARCHIVED,
        metadata: { updated: true },
      };

      expect(update.name).toBe('Updated Name');
      expect(update.status).toBe(ItemStatus.ARCHIVED);
    });

    it('should accept ItemUpdateInput with only one field', () => {
      const update: ItemUpdateInput = {
        name: 'Just update name',
      };

      expect(update.name).toBe('Just update name');
      expect(update.description).toBeUndefined();
    });

    it('should accept ItemUpdateInput with status change only', () => {
      const update: ItemUpdateInput = {
        status: ItemStatus.INACTIVE,
      };

      expect(update.status).toBe(ItemStatus.INACTIVE);
    });

    it('should accept empty ItemUpdateInput object', () => {
      const update: ItemUpdateInput = {};

      expect(Object.keys(update).length).toBe(0);
    });
  });

  describe('Item type validation scenarios', () => {
    it('should handle Item with complex metadata', () => {
      const item: Item = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '987fcdeb-51a2-43d7-9876-543210987654',
        name: 'Complex Item',
        status: ItemStatus.ACTIVE,
        metadata: {
          tags: ['tag1', 'tag2'],
          score: 95,
          nested: {
            field: 'value',
          },
        },
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(item.metadata).toHaveProperty('tags');
      expect(item.metadata).toHaveProperty('score');
      expect(item.metadata).toHaveProperty('nested');
    });

    it('should accept Item with null description', () => {
      const item: Item = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '987fcdeb-51a2-43d7-9876-543210987654',
        name: 'Item with null',
        status: ItemStatus.ACTIVE,
        description: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(item.description).toBeNull();
    });
  });

  describe('Type completeness', () => {
    it('should ensure Item has all expected properties', () => {
      const item: Item = {
        id: 'test-id',
        user_id: 'test-user',
        name: 'Test',
        status: ItemStatus.ACTIVE,
        created_at: '2024-01-01T00:00:00Z',
      };

      const expectedKeys = ['id', 'user_id', 'name', 'status', 'created_at'];
      expectedKeys.forEach((key) => {
        expect(item).toHaveProperty(key);
      });
    });

    it('should ensure enums have correct number of values', () => {
      const statusValues = Object.values(ItemStatus);
      expect(statusValues).toHaveLength(4); // ACTIVE, INACTIVE, ARCHIVED, DRAFT

      const categoryValues = Object.values(ItemCategory);
      expect(categoryValues).toHaveLength(4); // GENERAL, PERSONAL, WORK, OTHER
    });
  });
});
