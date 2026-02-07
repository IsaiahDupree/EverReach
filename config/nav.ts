/**
 * Navigation Configuration
 *
 * This file defines the navigation structure for both dashboard (authenticated)
 * and marketing (public) sections of the application.
 *
 * IMPORTANT: Customize these navigation items for your application:
 * - Update titles to match your features
 * - Modify hrefs to match your routes
 * - Replace "Items" with your entity name (e.g., "Projects", "Customers", "Orders")
 * - Add or remove navigation items as needed
 * - Import appropriate icons from lucide-react
 */

import {
  LayoutDashboard,
  Box,
  Settings,
  User,
  CreditCard,
  Home,
  DollarSign,
  Info,
  FileText,
  type LucideIcon,
} from 'lucide-react';

/**
 * Navigation Item Type
 * Defines the structure of a navigation item
 */
export interface NavItem {
  /** Display title of the navigation item */
  title: string;
  /** Route path (must start with /) */
  href: string;
  /** Optional icon component from lucide-react */
  icon?: LucideIcon;
  /** Optional description for tooltips or accessibility */
  description?: string;
  /** Optional nested navigation items */
  items?: NavSubItem[];
  /** Whether this item is disabled */
  disabled?: boolean;
  /** Whether this item should only show to specific roles */
  roles?: string[];
}

/**
 * Sub-navigation Item Type
 * Defines nested navigation items (without icons)
 */
export interface NavSubItem {
  /** Display title of the sub-navigation item */
  title: string;
  /** Route path (must start with /) */
  href: string;
  /** Optional description */
  description?: string;
  /** Whether this item is disabled */
  disabled?: boolean;
}

/**
 * Dashboard Navigation
 *
 * Used in the authenticated dashboard area (app/(dashboard))
 * These items appear in the sidebar navigation
 *
 * CUSTOMIZE: Replace "Items" with your entity name
 */
export const dashboardNav: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview and statistics',
  },
  {
    title: 'Items',
    href: '/items',
    icon: Box,
    description: 'Manage your items',
    // EXAMPLE: To add nested navigation
    // items: [
    //   {
    //     title: 'All Items',
    //     href: '/items',
    //     description: 'View all items',
    //   },
    //   {
    //     title: 'Create New',
    //     href: '/items/new',
    //     description: 'Create a new item',
    //   },
    // ],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Account settings and preferences',
    items: [
      {
        title: 'Profile',
        href: '/settings/profile',
        description: 'Manage your profile',
      },
      {
        title: 'Billing',
        href: '/settings/billing',
        description: 'Manage subscription and billing',
      },
    ],
  },
];

/**
 * Marketing Navigation
 *
 * Used in the public marketing area (app/(marketing))
 * These items appear in the navbar and footer
 *
 * CUSTOMIZE: Update titles and add/remove items as needed
 */
export const marketingNav: NavItem[] = [
  {
    title: 'Home',
    href: '/',
    description: 'Homepage',
  },
  {
    title: 'Pricing',
    href: '/pricing',
    icon: DollarSign,
    description: 'View pricing plans',
  },
  {
    title: 'About',
    href: '/about',
    icon: Info,
    description: 'Learn more about us',
  },
  {
    title: 'Docs',
    href: '/docs',
    icon: FileText,
    description: 'Documentation and guides',
    disabled: false, // Set to true to disable this nav item
  },
];

/**
 * Settings Navigation
 *
 * Used in the settings pages for sub-navigation
 * These items appear in settings sidebar or tabs
 */
export const settingsNav: NavItem[] = [
  {
    title: 'Profile',
    href: '/settings/profile',
    icon: User,
    description: 'Manage your profile information',
  },
  {
    title: 'Billing',
    href: '/settings/billing',
    icon: CreditCard,
    description: 'Manage subscription and billing',
  },
];

/**
 * Footer Navigation
 *
 * Used in the marketing footer
 * Organized into columns for the footer layout
 */
export const footerNav = {
  product: [
    { title: 'Features', href: '/features' },
    { title: 'Pricing', href: '/pricing' },
    { title: 'Changelog', href: '/changelog' },
  ],
  company: [
    { title: 'About', href: '/about' },
    { title: 'Blog', href: '/blog' },
    { title: 'Careers', href: '/careers' },
  ],
  resources: [
    { title: 'Documentation', href: '/docs' },
    { title: 'Support', href: '/support' },
    { title: 'Status', href: '/status' },
  ],
  legal: [
    { title: 'Privacy', href: '/privacy' },
    { title: 'Terms', href: '/terms' },
    { title: 'Cookie Policy', href: '/cookies' },
  ],
};

/**
 * Helper function to get all navigation hrefs
 * Useful for middleware or route validation
 */
export function getAllNavHrefs(): string[] {
  const hrefs: string[] = [];

  const extractHrefs = (items: NavItem[]) => {
    items.forEach((item) => {
      hrefs.push(item.href);
      if (item.items) {
        item.items.forEach((subItem) => hrefs.push(subItem.href));
      }
    });
  };

  extractHrefs(dashboardNav);
  extractHrefs(marketingNav);
  extractHrefs(settingsNav);

  return [...new Set(hrefs)]; // Remove duplicates
}
