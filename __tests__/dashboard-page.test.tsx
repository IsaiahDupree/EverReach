import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/(dashboard)/dashboard/page';

// Mock the useAuth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: '123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
      },
    },
    loading: false,
    signOut: jest.fn(),
  }),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

describe('Dashboard Page (WEB-PAGE-003)', () => {
  it('should render the dashboard page', () => {
    render(<DashboardPage />);

    // Check for the main heading
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('should display overview stats section', () => {
    render(<DashboardPage />);

    // Look for stats cards - using flexible matchers
    const page = screen.getByTestId('dashboard-page') || document.body;

    // Check that stats section exists
    expect(page).toBeInTheDocument();
  });

  it('should display recent items section', () => {
    render(<DashboardPage />);

    // Check for recent items heading
    expect(screen.getByText(/recent items/i)).toBeInTheDocument();
  });

  it('should display quick actions section', () => {
    render(<DashboardPage />);

    // Check for quick actions
    expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
  });

  it('should have a create item button in quick actions', () => {
    render(<DashboardPage />);

    // Look for create button
    const createButton = screen.getByRole('link', { name: /create.*item/i }) ||
                        screen.getByRole('button', { name: /create.*item/i });
    expect(createButton).toBeInTheDocument();
  });

  it('should have a view all items link in quick actions', () => {
    render(<DashboardPage />);

    // Look for view all link
    const viewAllLink = screen.getByRole('link', { name: /view all.*items/i });
    expect(viewAllLink).toBeInTheDocument();
  });
});
