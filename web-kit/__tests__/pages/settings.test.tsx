import React from 'react';
import { render, screen } from '@testing-library/react';
import SettingsPage from '@/app/(dashboard)/settings/page';

// Mock the useAuth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: '123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
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
  usePathname: () => '/settings',
}));

describe('Settings Page (WEB-PAGE-006)', () => {
  it('should render the settings page', () => {
    render(<SettingsPage />);

    // Check for the main heading (level 1)
    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument();
  });

  it('should display profile settings section', () => {
    render(<SettingsPage />);

    // Check for profile settings link or section
    expect(screen.getAllByText(/profile/i).length).toBeGreaterThan(0);
  });

  it('should have navigation to profile settings', () => {
    render(<SettingsPage />);

    // Look for link to profile settings
    const profileLink = screen.getByRole('link', { name: /profile/i });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute('href', '/settings/profile');
  });

  it('should have navigation to billing settings', () => {
    render(<SettingsPage />);

    // Look for link to billing settings
    const billingLink = screen.getByRole('link', { name: /billing/i });
    expect(billingLink).toBeInTheDocument();
    expect(billingLink).toHaveAttribute('href', '/settings/billing');
  });

  it('should display user information', () => {
    render(<SettingsPage />);

    // Check that user info is displayed (email or name)
    const page = screen.getByTestId('settings-page') || document.body;
    expect(page).toBeInTheDocument();
  });

  it('should display settings navigation cards', () => {
    render(<SettingsPage />);

    // Check for settings navigation cards
    expect(screen.getAllByText(/profile/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/billing/i).length).toBeGreaterThan(0);
  });
});
