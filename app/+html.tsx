import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every web page during static rendering.
 * The contents of this function only run in Node.js environments and do not have access to the DOM or browser APIs.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        
        {/* Meta Domain Verification - Required by Facebook in static HTML */}
        <meta name="facebook-domain-verification" content="0iq3tr1n2l3el130yp44fgehya7jcw" />
        
        {/* SEO Meta Tags */}
        <meta name="description" content="EverReach - AI-powered relationship intelligence that tells you exactly who to reach out to, what to say, and when to say it. Never let a relationship go cold again." />
        <meta name="keywords" content="CRM, personal CRM, relationship management, AI, networking, contacts" />
        <meta name="author" content="EverReach" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.everreach.app/" />
        <meta property="og:title" content="EverReach - Never Let A Relationship Go Cold Again" />
        <meta property="og:description" content="AI-powered relationship intelligence that tells you exactly who to reach out to, what to say, and when to say it." />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://www.everreach.app/" />
        <meta property="twitter:title" content="EverReach - Never Let A Relationship Go Cold Again" />
        <meta property="twitter:description" content="AI-powered relationship intelligence that tells you exactly who to reach out to, what to say, and when to say it." />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #0A0A0F;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #0A0A0F;
  }
}`;
