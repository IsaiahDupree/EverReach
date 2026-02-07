/**
 * ItemForm Component
 * Feature: IOS-COMP-005
 *
 * A form component for creating and editing items.
 * Supports both create and edit modes with form validation.
 *
 * Features:
 * - Create mode: Empty form for creating new items
 * - Edit mode: Pre-populated form for updating existing items
 * - Form validation with error messages
 * - Status and category selection
 * - Loading state during submission
 * - Accessibility support
 *
 * @module components/items/ItemForm
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ViewStyle,
} from 'react-native';
import Button from '../common/Button';
import Input from '../common/Input';
import { Item, ItemInput, ItemStatus, ItemCategory } from '../../types/item';

/**
 * ItemForm Component Props
 */
export interface ItemFormProps {
  /**
   * Item to edit (optional - if not provided, form is in create mode)
   */
  item?: Item;

  /**
   * Callback when form is submitted
   * Receives the form data (ItemInput)
   */
  onSubmit: (data: ItemInput) => void | Promise<void>;

  /**
   * Callback when form is cancelled
   */
  onCancel: () => void;

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
 * Form validation errors
 */
interface FormErrors {
  name?: string;
  description?: string;
}

/**
 * ItemForm Component
 *
 * A comprehensive form for creating and editing items with validation.
 * Automatically detects create vs edit mode based on whether an item is provided.
 *
 * @example
 * ```tsx
 * // Create mode
 * <ItemForm
 *   onSubmit={(data) => createItem(data)}
 *   onCancel={() => router.back()}
 * />
 *
 * // Edit mode
 * <ItemForm
 *   item={existingItem}
 *   onSubmit={(data) => updateItem(data)}
 *   onCancel={() => router.back()}
 * />
 * ```
 */
export default function ItemForm({
  item,
  onSubmit,
  onCancel,
  testID = 'item-form',
  style,
}: ItemFormProps) {
  // Determine if we're in edit mode
  const isEditMode = !!item;

  // Form state
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [status, setStatus] = useState<ItemStatus>(
    item?.status || ItemStatus.ACTIVE
  );
  const [category, setCategory] = useState<ItemCategory>(
    item?.category || ItemCategory.GENERAL
  );

  // Validation and loading state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when item changes (in edit mode)
  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || '');
      setStatus(item.status);
      setCategory(item.category || ItemCategory.GENERAL);
    }
  }, [item]);

  /**
   * Validate form fields
   * Returns true if valid, false if errors exist
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate name (required, min 3 chars, max 100 chars)
    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Name is required';
    } else if (trimmedName.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (trimmedName.length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Clear error for a specific field
   */
  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }

    // Prepare data
    const data: ItemInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      category,
    };

    // Submit
    try {
      setIsSubmitting(true);
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle name change with validation
   */
  const handleNameChange = (value: string) => {
    setName(value);
    if (errors.name && value.trim()) {
      clearError('name');
    }
  };

  /**
   * Handle description change
   */
  const handleDescriptionChange = (value: string) => {
    setDescription(value);
  };

  /**
   * Get status options
   */
  const statusOptions = [
    { label: 'Active', value: ItemStatus.ACTIVE },
    { label: 'Inactive', value: ItemStatus.INACTIVE },
    { label: 'Draft', value: ItemStatus.DRAFT },
    { label: 'Archived', value: ItemStatus.ARCHIVED },
  ];

  /**
   * Get category options
   */
  const categoryOptions = [
    { label: 'General', value: ItemCategory.GENERAL },
    { label: 'Personal', value: ItemCategory.PERSONAL },
    { label: 'Work', value: ItemCategory.WORK },
    { label: 'Other', value: ItemCategory.OTHER },
  ];

  return (
    <ScrollView
      style={[styles.container, style]}
      testID={testID}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.form}>
        {/* Name Input */}
        <Input
          label="Name"
          placeholder="Enter item name"
          value={name}
          onChangeText={handleNameChange}
          error={errors.name}
          testID="item-form-name-input"
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* Description Input */}
        <Input
          label="Description"
          placeholder="Enter item description"
          value={description}
          onChangeText={handleDescriptionChange}
          error={errors.description}
          testID="item-form-description-input"
          multiline
          optional
        />

        {/* Status Selector */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Status</Text>
          <View
            style={styles.selectorContainer}
            testID="item-form-status-selector"
          >
            {statusOptions.map((option) => (
              <Button
                key={option.value}
                variant={status === option.value ? 'primary' : 'secondary'}
                onPress={() => setStatus(option.value)}
                style={styles.selectorButton}
                testID={`status-${option.value}`}
              >
                {option.label}
              </Button>
            ))}
          </View>
        </View>

        {/* Category Selector */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Category</Text>
          <View
            style={styles.selectorContainer}
            testID="item-form-category-selector"
          >
            {categoryOptions.map((option) => (
              <Button
                key={option.value}
                variant={category === option.value ? 'primary' : 'secondary'}
                onPress={() => setCategory(option.value)}
                style={styles.selectorButton}
                testID={`category-${option.value}`}
              >
                {option.label}
              </Button>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            variant="secondary"
            onPress={onCancel}
            style={styles.actionButton}
            testID="item-form-cancel"
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onPress={handleSubmit}
            style={styles.actionButton}
            testID="item-form-submit"
            loading={isSubmitting}
          >
            {isEditMode ? 'Update Item' : 'Create Item'}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  form: {
    gap: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorButton: {
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
  },
});
