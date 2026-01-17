import React from 'react'

export default function SMSConsentPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">SMS Notification Consent</h1>
        <p className="text-sm text-gray-600 mb-8">Documentation of Opt-In Process</p>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Opt-In Process</h2>
            <p className="mb-4">
              EverReach collects SMS consent through explicit user opt-in at multiple touchpoints:
            </p>
            <ol className="list-decimal list-inside space-y-3">
              <li><strong>Account Registration:</strong> During signup, users can enable SMS notifications by checking a consent box and providing their phone number</li>
              <li><strong>Settings Page:</strong> Users can enable/disable SMS notifications at any time in Account Settings</li>
              <li><strong>Alert Configuration:</strong> When setting up warmth alerts, users are prompted to opt-in to SMS delivery</li>
              <li><strong>Confirmation Message:</strong> Upon opt-in, users receive a confirmation SMS with opt-out instructions</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Consent Storage</h2>
            <p className="mb-4">
              We maintain comprehensive records of user consent in our database:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Timestamp:</strong> Exact date and time of opt-in</li>
              <li><strong>Phone Number:</strong> The number that consented</li>
              <li><strong>IP Address:</strong> IP address at time of consent</li>
              <li><strong>User Agent:</strong> Device/browser information</li>
              <li><strong>Opt-In Source:</strong> Where consent was collected (registration, settings, alerts)</li>
              <li><strong>Consent Status:</strong> Active, revoked, or expired</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Message Types</h2>
            <p className="mb-4">Users who opt-in will receive the following types of SMS messages:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Warmth Alerts:</strong> Notifications when a contact relationship is cooling</li>
              <li><strong>Re-engagement Reminders:</strong> Prompts when it&apos;s time to reach out to a contact</li>
              <li><strong>Goal Notifications:</strong> Updates on relationship goals and milestones</li>
              <li><strong>System Alerts:</strong> Important account and security notifications</li>
              <li><strong>Feature Updates:</strong> Optional notifications about new features (can be disabled separately)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Message Frequency</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Typical:</strong> 2-5 messages per week</li>
              <li><strong>Maximum:</strong> 10 messages per week</li>
              <li><strong>Varies By:</strong> User activity, number of contacts being tracked, alert settings</li>
              <li><strong>User Control:</strong> Users can adjust alert frequency in settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Opt-Out Methods</h2>
            <p className="mb-4">Users can revoke consent at any time through multiple methods:</p>
            <ol className="list-decimal list-inside space-y-3">
              <li><strong>SMS Reply:</strong> Reply STOP to any message for immediate unsubscribe</li>
              <li><strong>Settings Page:</strong> Disable SMS notifications in account settings at https://everreach.app/settings</li>
              <li><strong>Support Request:</strong> Email support@everreach.app to opt-out</li>
              <li><strong>Account Deletion:</strong> Deleting your account automatically revokes all consents</li>
            </ol>
            <p className="mt-4">
              Upon opt-out, the user will receive a confirmation SMS and no further messages will be sent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Sample Messages</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="font-semibold mb-2">Warmth Alert:</p>
                <p className="text-gray-700">
                  &quot;🔥 Warmth Alert: Your contact with John Doe is cooling (warmth: 35/100). Last contact: 21 days ago. Consider reaching out! - EverReach&quot;
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="font-semibold mb-2">Re-engagement Reminder:</p>
                <p className="text-gray-700">
                  &quot;💡 Time to reconnect: You haven&apos;t reached out to Sarah Johnson in 30 days. Your relationship warmth is dropping. - EverReach&quot;
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="font-semibold mb-2">Opt-In Confirmation:</p>
                <p className="text-gray-700">
                  &quot;Thanks for enabling SMS notifications from EverReach! You&apos;ll receive warmth alerts and relationship reminders. Reply STOP to unsubscribe anytime.&quot;
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="font-semibold mb-2">Help Response:</p>
                <p className="text-gray-700">
                  &quot;EverReach CRM: Manage SMS preferences at https://everreach.app/settings. Reply STOP to unsubscribe. Support: support@everreach.app&quot;
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Compliance</h2>
            <p className="mb-4">
              Our SMS program complies with:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>TCPA:</strong> Telephone Consumer Protection Act - Express written consent required</li>
              <li><strong>CAN-SPAM Act:</strong> Clear opt-out mechanisms and sender identification</li>
              <li><strong>CTIA Guidelines:</strong> Short Code Best Practices</li>
              <li><strong>Carrier Requirements:</strong> T-Mobile, AT&T, Verizon messaging guidelines</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Technical Implementation</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Provider:</strong> Twilio (toll-free number)</li>
              <li><strong>Consent Tracking:</strong> PostgreSQL database with row-level security</li>
              <li><strong>Audit Trail:</strong> All opt-in/opt-out events logged with timestamps</li>
              <li><strong>Security:</strong> Encrypted data transmission (TLS/SSL)</li>
              <li><strong>Delivery:</strong> Real-time delivery with retry logic for failures</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Contact Information</h2>
            <ul className="list-none space-y-2">
              <li><strong>Support:</strong> <a href="mailto:support@everreach.app" className="text-blue-600 hover:underline">support@everreach.app</a></li>
              <li><strong>Website:</strong> <a href="https://everreach.app" className="text-blue-600 hover:underline">https://everreach.app</a></li>
              <li><strong>Settings:</strong> <a href="https://everreach.app/settings" className="text-blue-600 hover:underline">https://everreach.app/settings</a></li>
              <li><strong>Privacy Policy:</strong> <a href="https://everreach.app/privacy" className="text-blue-600 hover:underline">https://everreach.app/privacy</a></li>
              <li><strong>Terms of Service:</strong> <a href="https://everreach.app/terms" className="text-blue-600 hover:underline">https://everreach.app/terms</a></li>
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
