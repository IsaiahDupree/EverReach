import { buildRobots } from '@seo-workspace/next-seo-kit/robots'
import { siteConfig } from '@/lib/site-config'

export default function robots() {
  return buildRobots({
    siteUrl: siteConfig.siteUrl,
    disallow: ['/api/', '/dashboard/', '/settings/', '/auth/'],
    allow: ['/blog/'],
  })
}
