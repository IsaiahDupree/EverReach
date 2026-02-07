/**
 * Item Detail Page Tests
 *
 * Tests for WEB-PAGE-005: Item Detail Page
 *
 * Acceptance Criteria:
 * - Show item details
 * - Edit/delete actions
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useParams } from 'next/navigation';
import ItemDetailPage from '@/app/(dashboard)/items/[id]/page';

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock the auth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false,
  })),
}));

// Mock the items hook
const mockUseItem = jest.fn();
const mockUseUpdateItem = jest.fn();
const mockUseDeleteItem = jest.fn();

jest.mock('@/hooks/use-items', () => ({
  useItem: (id: string) => mockUseItem(id),
  useUpdateItem: () => mockUseUpdateItem(),
  useDeleteItem: () => mockUseDeleteItem(),
}));

describe('ItemDetailPage', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();
  const mockMutate = jest.fn();
  const mockDeleteMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
    (useParams as jest.Mock).mockReturnValue({
      id: 'test-item-id',
    });
    mockUseUpdateItem.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    mockUseDeleteItem.mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    });
  });

  it('should render loading state while fetching item', () => {
    mockUseItem.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<ItemDetailPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render item details', () => {
    const mockItem = {
      id: 'test-item-id',
      title: 'Test Item',
      description: 'This is a test item description',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      user_id: 'test-user-id',
    };

    mockUseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: null,
    });

    render(<ItemDetailPage />);

    expect(screen.getByText('Test Item')).toBeInTheDocument();
    expect(screen.getByText('This is a test item description')).toBeInTheDocument();
  });

  it('should display edit button', () => {
    const mockItem = {
      id: 'test-item-id',
      title: 'Test Item',
      description: 'Test description',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      user_id: 'test-user-id',
    };

    mockUseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: null,
    });

    render(<ItemDetailPage />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    expect(editButton).toBeInTheDocument();
  });

  it('should display delete button', () => {
    const mockItem = {
      id: 'test-item-id',
      title: 'Test Item',
      description: 'Test description',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      user_id: 'test-user-id',
    };

    mockUseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: null,
    });

    render(<ItemDetailPage />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it('should handle delete action', async () => {
    const mockItem = {
      id: 'test-item-id',
      title: 'Test Item',
      description: 'Test description',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      user_id: 'test-user-id',
    };

    mockUseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: null,
    });

    mockDeleteMutate.mockImplementation((id, { onSuccess }) => {
      onSuccess();
    });

    const user = userEvent.setup();
    render(<ItemDetailPage />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Should show confirmation dialog
    const confirmButton = await screen.findByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    expect(mockDeleteMutate).toHaveBeenCalledWith(
      'test-item-id',
      expect.objectContaining({
        onSuccess: expect.any(Function),
      })
    );
  });

  it('should navigate back after successful delete', async () => {
    const mockItem = {
      id: 'test-item-id',
      title: 'Test Item',
      description: 'Test description',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      user_id: 'test-user-id',
    };

    mockUseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: null,
    });

    mockDeleteMutate.mockImplementation((id, { onSuccess }) => {
      onSuccess();
    });

    const user = userEvent.setup();
    render(<ItemDetailPage />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    const confirmButton = await screen.findByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/items');
    });
  });

  it('should display error state when item not found', () => {
    mockUseItem.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Item not found'),
    });

    render(<ItemDetailPage />);

    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });

  it('should display back button', () => {
    const mockItem = {
      id: 'test-item-id',
      title: 'Test Item',
      description: 'Test description',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      user_id: 'test-user-id',
    };

    mockUseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: null,
    });

    render(<ItemDetailPage />);

    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton).toBeInTheDocument();
  });

  it('should navigate back when back button is clicked', async () => {
    const mockItem = {
      id: 'test-item-id',
      title: 'Test Item',
      description: 'Test description',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      user_id: 'test-user-id',
    };

    mockUseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: null,
    });

    const user = userEvent.setup();
    render(<ItemDetailPage />);

    const backButton = screen.getByRole('button', { name: /back/i });
    await user.click(backButton);

    expect(mockBack).toHaveBeenCalled();
  });

  it('should show created and updated dates', () => {
    const mockItem = {
      id: 'test-item-id',
      title: 'Test Item',
      description: 'Test description',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      user_id: 'test-user-id',
    };

    mockUseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: null,
    });

    render(<ItemDetailPage />);

    expect(screen.getByText(/created/i)).toBeInTheDocument();
    expect(screen.getByText(/updated/i)).toBeInTheDocument();
  });
});
