import React from 'react'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: October 19, 2025</p>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using EverReach, you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">2. Service Description</h2>
            <p className="mb-3">
              EverReach is an AI-powered relationship management CRM that helps professionals maintain their network through warmth tracking, proactive alerts, and AI-powered insights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">3. Account and Eligibility</h2>
            <p className="mb-3">You must be at least 18 years old to use EverReach. You are responsible for:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Providing accurate registration information</li>
              <li>Maintaining account security and confidentiality</li>
              <li>All activities under your account</li>
              <li>Notifying us of unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">4. Subscription and Billing</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">4.1 Free Trial</h3>
            <p className="mb-3">New users receive a 7-day free trial. If not canceled, you will be automatically enrolled in a paid subscription.</p>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">4.2 Billing</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Subscriptions billed monthly or annually in advance</li>
              <li>Fees are non-refundable except as required by law</li>
              <li>Cancel anytime; access continues until end of billing period</li>
              <li>Payments processed securely through Stripe</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">5. Acceptable Use</h2>
            <p className="mb-3">You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Violate laws or third-party rights</li>
              <li>Send spam or unsolicited commercial messages</li>
              <li>Harass, abuse, or harm others</li>
              <li>Upload malware or harmful code</li>
              <li>Scrape or reverse engineer the Service</li>
              <li>Use the Service for illegal purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">6. SMS Messaging Terms</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">6.1 Consent</h3>
            <p className="mb-3">
              By opting in, you consent to receive SMS notifications including warmth alerts, reminders, and account updates at your phone number.
            </p>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">6.2 Frequency & Charges</h3>
            <ul className="list-disc list-inside space-y-2 mb-3">
              <li>Message frequency varies; up to 10 messages per week</li>
              <li>Standard carrier rates may apply</li>
              <li>We are not responsible for carrier fees or delays</li>
            </ul>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">6.3 Opt-Out</h3>
            <p>
              Reply STOP to unsubscribe, HELP for support, or adjust settings at https://everreach.app/settings
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">7. User Content</h2>
            <p className="mb-3">
              You retain ownership of your content. You grant us a license to use your content to provide the Service, including AI processing for analysis and recommendations.
            </p>
            <p>You are responsible for the accuracy and legality of your content.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">8. AI Features</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>AI-generated content may contain errors</li>
              <li>You must review all AI content before use</li>
              <li>You are responsible for all communications sent</li>
              <li>We process data via OpenAI; they do not use it for training</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">9. Disclaimers</h2>
            <p className="mb-3">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES. WE DO NOT GUARANTEE UNINTERRUPTED OR ERROR-FREE OPERATION.
            </p>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">10. Termination</h2>
            <p>
              We may suspend or terminate your account for violations of these Terms. You may terminate your account at any time. Upon termination, your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">11. Privacy</h2>
            <p>
              Your use of EverReach is also governed by our Privacy Policy at <a href="https://everreach.app/privacy" className="text-blue-600 hover:underline">https://everreach.app/privacy</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">12. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Continued use after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">13. Contact</h2>
            <ul className="list-none space-y-2">
              <li><strong>Email:</strong> <a href="mailto:support@everreach.app" className="text-blue-600 hover:underline">support@everreach.app</a></li>
              <li><strong>Website:</strong> <a href="https://everreach.app" className="text-blue-600 hover:underline">https://everreach.app</a></li>
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
