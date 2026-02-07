/**
 * Items List Page Tests
 *
 * Tests for WEB-PAGE-004: Items List Page
 *
 * Acceptance Criteria:
 * - Data table displaying items
 * - Pagination support
 * - Create button for adding new items
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import ItemsPage from '@/app/(dashboard)/items/page';

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the auth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false,
  })),
}));

// Mock the items hook
const mockUseItems = jest.fn();
jest.mock('@/hooks/use-items', () => ({
  useItems: () => mockUseItems(),
}));

describe('ItemsPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('should render the page title', () => {
    mockUseItems.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      error: null,
    });

    render(<ItemsPage />);

    expect(screen.getByText('Items')).toBeInTheDocument();
  });

  it('should display a create button', () => {
    mockUseItems.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      error: null,
    });

    render(<ItemsPage />);

    const createButtons = screen.getAllByRole('link', { name: /create item/i });
    expect(createButtons.length).toBeGreaterThan(0);
    expect(createButtons[0]).toHaveAttribute('href', '/items/new');
  });

  it('should display loading state while fetching items', () => {
    mockUseItems.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<ItemsPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should display empty state when no items exist', () => {
    mockUseItems.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      error: null,
    });

    render(<ItemsPage />);

    expect(screen.getByText(/no items found/i)).toBeInTheDocument();
  });

  it('should display items in a table', () => {
    const mockItems = [
      {
        id: '1',
        title: 'Test Item 1',
        description: 'Description 1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: 'test-user-id',
      },
      {
        id: '2',
        title: 'Test Item 2',
        description: 'Description 2',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        user_id: 'test-user-id',
      },
    ];

    mockUseItems.mockReturnValue({
      data: { items: mockItems, total: 2 },
      isLoading: false,
      error: null,
    });

    render(<ItemsPage />);

    // Check for table headers
    expect(screen.getByRole('columnheader', { name: /title/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /description/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /created/i })).toBeInTheDocument();

    // Check for items in table
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Description 2')).toBeInTheDocument();
  });

  it('should display pagination when items exceed page size', () => {
    const mockItems = Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      title: `Test Item ${i + 1}`,
      description: `Description ${i + 1}`,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_id: 'test-user-id',
    }));

    mockUseItems.mockReturnValue({
      data: { items: mockItems, total: 25 },
      isLoading: false,
      error: null,
    });

    render(<ItemsPage />);

    // Should show pagination controls
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });

  it('should allow clicking on item row to view details', async () => {
    const mockItems = [
      {
        id: '1',
        title: 'Test Item 1',
        description: 'Description 1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: 'test-user-id',
      },
    ];

    mockUseItems.mockReturnValue({
      data: { items: mockItems, total: 1 },
      isLoading: false,
      error: null,
    });

    const user = userEvent.setup();
    render(<ItemsPage />);

    const row = screen.getByRole('row', { name: /test item 1/i });
    await user.click(row);

    expect(mockPush).toHaveBeenCalledWith('/items/1');
  });

  it('should display error state when fetch fails', () => {
    mockUseItems.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch items'),
    });

    render(<ItemsPage />);

    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
  });
});
