/**
 * Site Configuration
 *
 * This file contains the core metadata and configuration for your application.
 *
 * IMPORTANT: Update these values before deploying to production:
 * - name: Your application name
 * - description: SEO-friendly description
 * - url: Your production domain
 * - links: Your social media and repository links
 * - keywords: Relevant keywords for SEO
 */

export type SiteConfig = {
  name: string;
  description: string;
  tagline: string;
  url: string;
  appUrl?: string;
  ogImage: string;
  creator?: string;
  keywords: string[];
  links: {
    github: string;
    twitter: string;
    linkedin?: string;
    discord?: string;
  };
};

export const siteConfig: SiteConfig = {
  // Basic Information
  name: "YOUR_APP_NAME",
  description: "A production-ready web application with authentication, payments, and modern UI out of the box.",
  tagline: "Ship faster with our starter kit",

  // URLs
  url: "https://YOUR_DOMAIN.com",
  appUrl: "https://app.YOUR_DOMAIN.com", // Optional: separate app subdomain

  // Open Graph Image (for social media sharing)
  ogImage: "https://YOUR_DOMAIN.com/og-image.png",

  // Creator/Company Information
  creator: "Your Company Name",

  // SEO Keywords
  keywords: [
    "next.js",
    "react",
    "typescript",
    "tailwind css",
    "saas",
    "starter kit",
    "boilerplate",
    "authentication",
    "payments",
    "stripe",
    "supabase",
  ],

  // Social Media & External Links
  links: {
    github: "https://github.com/YOUR_USERNAME/YOUR_REPO",
    twitter: "https://twitter.com/YOUR_HANDLE",
    linkedin: "https://linkedin.com/company/YOUR_COMPANY",
    discord: "https://discord.gg/YOUR_INVITE",
  },
};

/**
 * Navigation Routes
 * Define your main navigation structure here
 */
export const navRoutes = {
  marketing: [
    { href: "/", label: "Home" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
  ],
  dashboard: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/items", label: "Items" },
    { href: "/settings", label: "Settings" },
  ],
  auth: [
    { href: "/login", label: "Sign In" },
    { href: "/signup", label: "Sign Up" },
  ],
};

/**
 * Feature Flags
 * Enable/disable features across the application
 */
export const features = {
  auth: {
    emailPassword: true,
    oauth: true,
    magicLink: false,
  },
  payments: {
    stripe: true,
    subscriptions: true,
  },
  ui: {
    darkMode: true,
    animations: true,
  },
};
