/**
 * Sitemap Generation
 *
 * This file automatically generates a sitemap.xml for your application.
 * It lists all public routes for search engines to crawl.
 *
 * Next.js will automatically serve this at /sitemap.xml
 *
 * IMPORTANT: Update the routes array when you add new public pages.
 * Protected routes (dashboard, settings, etc.) should NOT be included.
 */

import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;

  // Define all public routes that should be in the sitemap
  const routes = [
    {
      url: '/',
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: '/pricing',
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: '/login',
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: '/signup',
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ];

  // Generate sitemap entries
  return routes.map((route) => ({
    url: `${baseUrl}${route.url}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
