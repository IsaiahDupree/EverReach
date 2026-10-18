import React from 'react'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: October 19, 2025</p>

        <div className="space-y-8 text-gray-700">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p className="mb-3">
              Welcome to EverReach (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, disclose, and safeguard your information when you use our relationship management CRM platform.
            </p>
            <p>
              EverReach is an AI-powered personal CRM that helps you maintain and strengthen your professional relationships through intelligent warmth tracking, proactive alerts, and automated relationship insights.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li><strong>Account Information:</strong> Name, email address, phone number, password</li>
              <li><strong>Contact Data:</strong> Names, email addresses, phone numbers, notes, tags, and custom fields for your professional contacts</li>
              <li><strong>Interaction Logs:</strong> Records of communications, meetings, and touchpoints with your contacts</li>
              <li><strong>Voice Notes:</strong> Audio recordings you upload for transcription and analysis</li>
              <li><strong>Screenshots:</strong> Images you upload for AI-powered contact extraction</li>
              <li><strong>Payment Information:</strong> Billing details processed securely through Stripe</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-2">2.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li><strong>Usage Data:</strong> Features used, pages viewed, time spent, interaction patterns</li>
              <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
              <li><strong>Analytics Data:</strong> Campaign performance, warmth scores, recommendation effectiveness</li>
              <li><strong>Log Data:</strong> API requests, error logs, performance metrics</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use your information to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Provide Services:</strong> Deliver core CRM functionality, warmth tracking, and relationship insights</li>
              <li><strong>AI Features:</strong> Generate personalized messages, analyze contacts, provide recommendations</li>
              <li><strong>Notifications:</strong> Send warmth alerts, re-engagement reminders, and goal tracking updates via SMS and email</li>
              <li><strong>Analytics:</strong> Track usage patterns, measure feature effectiveness, improve recommendations</li>
              <li><strong>Communication:</strong> Send service updates, feature announcements, and support responses</li>
              <li><strong>Security:</strong> Detect fraud, prevent abuse, ensure platform security</li>
              <li><strong>Compliance:</strong> Meet legal obligations and enforce our terms</li>
              <li><strong>Improvement:</strong> Develop new features, enhance user experience, fix bugs</li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">4. Third-Party Services</h2>
            <p className="mb-3">We use the following trusted third-party services:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Supabase:</strong> Database and authentication infrastructure</li>
              <li><strong>OpenAI:</strong> AI-powered contact analysis and message generation</li>
              <li><strong>Resend:</strong> Email delivery for campaigns and notifications</li>
              <li><strong>Twilio:</strong> SMS delivery for warmth alerts and reminders</li>
              <li><strong>Stripe:</strong> Payment processing and subscription management</li>
              <li><strong>Vercel:</strong> Hosting and deployment infrastructure</li>
            </ul>
            <p className="mt-3">
              These services have access only to information necessary to perform their functions and are obligated to protect your data.
            </p>
          </section>

          {/* AI and Data Processing */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">5. AI and Data Processing</h2>
            <p className="mb-3">
              EverReach uses artificial intelligence to provide intelligent features:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Contact Analysis:</strong> AI analyzes your contact data to generate relationship insights and health scores</li>
              <li><strong>Message Generation:</strong> AI creates personalized message suggestions based on your contacts and interaction history</li>
              <li><strong>Voice Transcription:</strong> Audio recordings are transcribed and analyzed for contact extraction</li>
              <li><strong>Screenshot Analysis:</strong> Images are analyzed using AI vision to extract contact information</li>
              <li><strong>Recommendations:</strong> AI generates proactive suggestions for relationship maintenance</li>
            </ul>
            <p className="mt-3">
              Your data is processed by OpenAI&apos;s GPT-4 model. OpenAI does not use customer data to train their models. All AI processing happens securely and your data remains private.
            </p>
          </section>

          {/* SMS Notifications and Consent */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">6. SMS Notifications and Consent</h2>
            <p className="mb-3">
              <strong>Opt-In Process:</strong> You explicitly opt-in to SMS notifications during account setup or in your settings. By opting in, you consent to receive:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>Warmth alerts when your contact relationships are cooling</li>
              <li>Re-engagement reminders when it&apos;s time to reach out</li>
              <li>Important contact updates and goal tracking notifications</li>
              <li>Account security alerts and service notifications</li>
            </ul>
            <p className="mb-3">
              <strong>Message Frequency:</strong> Message frequency varies based on your contact activity and alert settings. You may receive up to 10 messages per week.
            </p>
            <p className="mb-3">
              <strong>Opt-Out:</strong> Reply STOP to any SMS to unsubscribe immediately. Reply HELP for support. You can also manage SMS preferences in your account settings at any time.
            </p>
            <p className="mb-3">
              <strong>Standard Rates:</strong> Message and data rates may apply from your mobile carrier.
            </p>
            <p>
              <strong>Consent Storage:</strong> We track your SMS consent with timestamps in our database and maintain records for compliance purposes.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">7. Data Retention</h2>
            <p className="mb-3">We retain your information for as long as necessary to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Provide our services and maintain your account</li>
              <li>Comply with legal obligations and resolve disputes</li>
              <li>Enforce our terms and prevent fraud</li>
              <li>Improve our services and develop new features</li>
            </ul>
            <p className="mt-3">
              When you delete your account, we permanently delete your personal data within 30 days, except where retention is required by law.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">8. Data Security</h2>
            <p className="mb-3">We implement industry-standard security measures:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Encryption:</strong> TLS/SSL encryption for data in transit, AES-256 encryption at rest</li>
              <li><strong>Authentication:</strong> Secure password hashing with bcrypt, JWT-based sessions</li>
              <li><strong>Access Controls:</strong> Role-based access control (RBAC) and row-level security (RLS)</li>
              <li><strong>Monitoring:</strong> 24/7 security monitoring, intrusion detection, audit logging</li>
              <li><strong>Compliance:</strong> SOC 2 Type II infrastructure, GDPR compliance measures</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">9. Your Privacy Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Restrict:</strong> Limit how we process your data</li>
              <li><strong>Object:</strong> Object to certain data processing activities</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us at <a href="mailto:support@everreach.app" className="text-blue-600 hover:underline">support@everreach.app</a>
            </p>
          </section>

          {/* GDPR and International Users */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">10. GDPR and International Users</h2>
            <p className="mb-3">
              If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have additional rights under GDPR:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Right to data portability and automated decision-making opt-out</li>
              <li>Right to lodge a complaint with your local data protection authority</li>
              <li>Lawful basis for processing: Consent, contract performance, legitimate interests</li>
            </ul>
            <p className="mt-3">
              We transfer data internationally with appropriate safeguards including standard contractual clauses.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">11. Children&apos;s Privacy</h2>
            <p>
              EverReach is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">12. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of material changes by email or through the service. Your continued use of EverReach after changes indicates acceptance of the updated policy.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">13. Contact Us</h2>
            <p className="mb-3">For privacy-related questions or requests:</p>
            <ul className="list-none space-y-2">
              <li><strong>Email:</strong> <a href="mailto:support@everreach.app" className="text-blue-600 hover:underline">support@everreach.app</a></li>
              <li><strong>Website:</strong> <a href="https://everreach.app" className="text-blue-600 hover:underline">https://everreach.app</a></li>
              <li><strong>Privacy Officer:</strong> <a href="mailto:isaiahdupree33@gmail.com" className="text-blue-600 hover:underline">isaiahdupree33@gmail.com</a></li>
            </ul>
          </section>

          {/* State-Specific Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">14. California Privacy Rights (CCPA)</h2>
            <p className="mb-3">
              California residents have additional rights under CCPA:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Right to know what personal information is collected, used, shared, or sold</li>
              <li>Right to delete personal information held by businesses</li>
              <li>Right to opt-out of sale of personal information (we do not sell your data)</li>
              <li>Right to non-discrimination for exercising CCPA rights</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            © 2025 EverReach. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
