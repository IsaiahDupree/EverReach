/**
 * ItemForm Component Tests
 * Feature: IOS-COMP-005
 *
 * Tests for the item create/edit form component.
 * Tests form validation and both create and edit modes.
 *
 * @module __tests__/components/items/ItemForm
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ItemForm from '../../../components/items/ItemForm';
import { Item, ItemStatus, ItemCategory } from '../../../types/item';

describe('ItemForm Component', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  // Mock item for edit mode
  const mockItem: Item = {
    id: '123',
    user_id: 'user-1',
    name: 'Test Item',
    description: 'Test description',
    status: ItemStatus.ACTIVE,
    category: ItemCategory.GENERAL,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render in create mode by default', () => {
      const { getByTestId } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );
      expect(getByTestId('item-form')).toBeTruthy();
    });

    it('should render in edit mode with initial values', () => {
      const { getByTestId, getByDisplayValue } = render(
        <ItemForm
          item={mockItem}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );
      expect(getByTestId('item-form')).toBeTruthy();
      expect(getByDisplayValue('Test Item')).toBeTruthy();
      expect(getByDisplayValue('Test description')).toBeTruthy();
    });

    it('should render name input field', () => {
      const { getByTestId } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );
      expect(getByTestId('item-form-name-input')).toBeTruthy();
    });

    it('should render description input field', () => {
      const { getByTestId } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );
      expect(getByTestId('item-form-description-input')).toBeTruthy();
    });

    it('should render status selector', () => {
      const { getByTestId } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );
      expect(getByTestId('item-form-status-selector')).toBeTruthy();
    });

    it('should render category selector', () => {
      const { getByTestId } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );
      expect(getByTestId('item-form-category-selector')).toBeTruthy();
    });

    it('should render submit button', () => {
      const { getByTestId } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );
      expect(getByTestId('item-form-submit')).toBeTruthy();
    });

    it('should render cancel button', () => {
      const { getByTestId } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );
      expect(getByTestId('item-form-cancel')).toBeTruthy();
    });
  });

  describe('Create Mode', () => {
    it('should show "Create Item" as submit button text in create mode', () => {
      const { getByText } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );
      expect(getByText('Create Item')).toBeTruthy();
    });

    it('should have empty initial values in create mode', () => {
      const { getByTestId } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );
      const nameInput = getByTestId('item-form-name-input');
      expect(nameInput.props.value).toBe('');
    });

    it('should submit form with correct data in create mode', async () => {
      const { getByTestId } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const nameInput = getByTestId('item-form-name-input');
      const descriptionInput = getByTestId('item-form-description-input');
      const submitButton = getByTestId('item-form-submit');

      fireEvent.changeText(nameInput, 'New Item');
      fireEvent.changeText(descriptionInput, 'New description');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'New Item',
          description: 'New description',
          status: ItemStatus.ACTIVE,
          category: ItemCategory.GENERAL,
        });
      });
    });
  });

  describe('Edit Mode', () => {
    it('should show "Update Item" as submit button text in edit mode', () => {
      const { getByText } = render(
        <ItemForm
          item={mockItem}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );
      expect(getByText('Update Item')).toBeTruthy();
    });

    it('should populate form with item data in edit mode', () => {
      const { getByDisplayValue } = render(
        <ItemForm
          item={mockItem}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );
      expect(getByDisplayValue('Test Item')).toBeTruthy();
      expect(getByDisplayValue('Test description')).toBeTruthy();
    });

    it('should submit form with updated data in edit mode', async () => {
      const { getByTestId, getByDisplayValue } = render(
        <ItemForm
          item={mockItem}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = getByDisplayValue('Test Item');
      const submitButton = getByTestId('item-form-submit');

      fireEvent.changeText(nameInput, 'Updated Item');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Item',
          })
        );
      });
    });
  });

  describe('Form Validation', () => {
    it('should show error when name is empty', async () => {
      const { getByTestId, getByText } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const submitButton = getByTestId('item-form-submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Name is required')).toBeTruthy();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when name is too short', async () => {
      const { getByTestId, getByText } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const nameInput = getByTestId('item-form-name-input');
      const submitButton = getByTestId('item-form-submit');

      fireEvent.changeText(nameInput, 'AB');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Name must be at least 3 characters')).toBeTruthy();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when name is too long', async () => {
      const { getByTestId, getByText } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const nameInput = getByTestId('item-form-name-input');
      const submitButton = getByTestId('item-form-submit');

      const longName = 'A'.repeat(101);
      fireEvent.changeText(nameInput, longName);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Name must be less than 100 characters')).toBeTruthy();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should clear errors when input is corrected', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const nameInput = getByTestId('item-form-name-input');
      const submitButton = getByTestId('item-form-submit');

      // Submit with empty name
      fireEvent.press(submitButton);
      await waitFor(() => {
        expect(getByText('Name is required')).toBeTruthy();
      });

      // Fix the error
      fireEvent.changeText(nameInput, 'Valid Name');

      await waitFor(() => {
        expect(queryByText('Name is required')).toBeFalsy();
      });
    });

    it('should allow optional description to be empty', async () => {
      const { getByTestId } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const nameInput = getByTestId('item-form-name-input');
      const submitButton = getByTestId('item-form-submit');

      fireEvent.changeText(nameInput, 'Valid Name');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should trim whitespace from name', async () => {
      const { getByTestId } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const nameInput = getByTestId('item-form-name-input');
      const submitButton = getByTestId('item-form-submit');

      fireEvent.changeText(nameInput, '  Trimmed Name  ');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Trimmed Name',
          })
        );
      });
    });
  });

  describe('Form Interaction', () => {
    it('should call onCancel when cancel button is pressed', () => {
      const { getByTestId } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const cancelButton = getByTestId('item-form-cancel');
      fireEvent.press(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should show loading state on submit button during submission', async () => {
      const slowSubmit = jest.fn(
        (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { getByTestId } = render(
        <ItemForm onSubmit={slowSubmit} onCancel={mockOnCancel} />
      );

      const nameInput = getByTestId('item-form-name-input');
      const submitButton = getByTestId('item-form-submit');

      fireEvent.changeText(nameInput, 'Valid Name');
      fireEvent.press(submitButton);

      // Check that button shows loading state
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should update form values when typing', () => {
      const { getByTestId } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const nameInput = getByTestId('item-form-name-input');
      const descriptionInput = getByTestId('item-form-description-input');

      fireEvent.changeText(nameInput, 'Test');
      fireEvent.changeText(descriptionInput, 'Description');

      expect(nameInput.props.value).toBe('Test');
      expect(descriptionInput.props.value).toBe('Description');
    });
  });

  describe('Acceptance Criteria', () => {
    it('should support form validation with proper error messages', async () => {
      const { getByTestId, getByText } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const submitButton = getByTestId('item-form-submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Name is required')).toBeTruthy();
      });
    });

    it('should support create mode with empty initial state', () => {
      const { getByTestId, getByText } = render(
        <ItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      expect(getByTestId('item-form')).toBeTruthy();
      expect(getByText('Create Item')).toBeTruthy();
    });

    it('should support edit mode with pre-populated data', () => {
      const { getByTestId, getByText, getByDisplayValue } = render(
        <ItemForm
          item={mockItem}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(getByTestId('item-form')).toBeTruthy();
      expect(getByText('Update Item')).toBeTruthy();
      expect(getByDisplayValue('Test Item')).toBeTruthy();
    });
  });
});
