/**
 * Robots.txt Generation
 *
 * This file automatically generates a robots.txt for your application.
 * It controls how search engine crawlers interact with your site.
 *
 * Next.js will automatically serve this at /robots.txt
 *
 * IMPORTANT: Review these settings before deploying to production:
 * - Ensure API routes are blocked from indexing
 * - Verify the sitemap URL matches your production domain
 * - Adjust crawling rules based on your needs
 */

import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.url;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
