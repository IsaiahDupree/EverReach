import { buildSitemap, sitemapPresets } from '@seo-workspace/next-seo-kit/sitemap'
import { siteConfig } from '@/lib/site-config'

export default function sitemap() {
  return buildSitemap({
    siteUrl: siteConfig.siteUrl,
    staticRoutes: [
      sitemapPresets.homepage,
      { path: '/features', priority: 0.8, changeFrequency: 'weekly' },
      { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' },
      { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
      { path: '/download', priority: 0.9, changeFrequency: 'weekly' },
      sitemapPresets.faq,
    ],
  })
}
