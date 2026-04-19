import './globals.css'
import Script from 'next/script'
import AuthFragmentHandler from '@/components/AuthFragmentHandler'
import { QueryProvider } from '@/lib/query-provider'
import { ToastProvider } from '@/components/ui/Toast'
import { PostHogProvider } from '@/app/providers/PostHogProvider'
import { LayoutClient } from '@/components/LayoutClient'
import { buildBaseMetadata } from '@seo-workspace/next-seo-kit'
import { OrganizationSchema, SoftwareAppSchema } from '@seo-workspace/next-seo-kit/schema'
import { siteConfig } from '@/lib/site-config'

export const metadata = buildBaseMetadata(siteConfig)

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body className="min-h-screen bg-white text-gray-900">
        <OrganizationSchema
          name={siteConfig.siteName}
          url={siteConfig.siteUrl}
          logoUrl={`${siteConfig.siteUrl}/logo.png`}
          description="Re-engage the people you've lost touch with. EverReach automatically keeps your relationships alive."
          sameAs={[
            'https://twitter.com/everreachapp',
            'https://instagram.com/everreachapp',
          ]}
        />
        <SoftwareAppSchema
          name="EverReach"
          description="Re-engage the people you've lost touch with. EverReach automatically keeps your relationships alive."
          url={siteConfig.siteUrl}
          operatingSystem="iOS"
          applicationCategory="SocialNetworkingApplication"
          price="0"
          priceCurrency="USD"
        />
        <PostHogProvider>
          <QueryProvider>
            <ToastProvider>
              <AuthFragmentHandler />
              <LayoutClient>{children}</LayoutClient>
            </ToastProvider>
          </QueryProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}
