import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function TermsOfServiceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Analytics tracking
  useAnalytics('TermsOfService');
  const lastUpdated = 'Feb 9, 2026';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen 
        options={{
          title: 'Terms of Service',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#000000" />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.lastUpdated}>Last updated: {lastUpdated}</Text>
          <TouchableOpacity 
            onPress={() => Linking.openURL('https://www.everreach.app/terms')}
            style={styles.webLinkContainer}
          >
            <Text style={styles.webLink}>https://www.everreach.app/terms</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Eligibility & Accounts</Text>
            <Text style={styles.paragraph}>
              You must be at least 18 and capable of forming a contract. You agree to provide accurate account
              information and keep your credentials secure.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Access via ChatGPT / Custom GPT</Text>
            <Text style={styles.paragraph}>
              When you use EverReach inside ChatGPT, you authorize our Actions/MCP tools to process your prompts
              and call EverReach APIs per the scopes you approve. Chat transcripts are controlled by OpenAI.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Your Data</Text>
            <Text style={styles.paragraph}>
              You retain all rights to your data (contacts, notes, screenshots, outputs). You grant us a
              limited license to process your data to operate and improve the Service as described in the
              Privacy Policy. You are responsible for obtaining permissions to upload third‑party personal data.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Acceptable Use</Text>
            <Text style={styles.paragraph}>No illegal or harmful activity. You agree not to:</Text>
            <Text style={styles.bulletPoint}>• Reverse engineer, scrape, or attempt to bypass security</Text>
            <Text style={styles.bulletPoint}>• Infringe IP rights or build competing datasets without consent</Text>
            <Text style={styles.bulletPoint}>• Harass, abuse, or violate applicable laws or regulations</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Plans, Fees, and Taxes</Text>
            <Text style={styles.paragraph}>
              Paid subscriptions renew automatically until canceled. You agree to pay fees and any applicable
              taxes. Pricing changes will apply to the next term after notice.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Third‑Party Services</Text>
            <Text style={styles.paragraph}>
              Integrations (email, analytics, purchases, ad measurement, LLMs) are provided by third parties under their terms.
              These include Supabase, RevenueCat, PostHog, Meta Conversions API, and Apple/Google platform services.
              We are not responsible for third‑party services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Beta & Experimental Features</Text>
            <Text style={styles.paragraph}>
              Some features may be labeled Beta and provided “as is” for evaluation without guarantees.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. IP & Feedback</Text>
            <Text style={styles.paragraph}>
              We own the Service and related IP. You grant us a perpetual, irrevocable license to use feedback
              you provide to improve the Service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Confidentiality</Text>
            <Text style={styles.paragraph}>
              Each party will protect the other's confidential information with reasonable care and use it only
              as permitted.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Data Processing & Privacy</Text>
            <Text style={styles.paragraph}>
              Our Privacy Policy and, where applicable, a Data Processing Addendum govern personal data
              processing. For DPA inquiries, contact privacy@everreach.app.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Warranties & Disclaimers</Text>
            <Text style={styles.paragraph}>
              The Service is provided “as is” without warranties of any kind, including merchantability, fitness,
              or non‑infringement. We do not warrant uninterrupted or error‑free operation or accuracy of
              outputs.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Limitation of Liability</Text>
            <Text style={styles.paragraph}>
              To the maximum extent permitted by law, neither party is liable for indirect, incidental, special,
              consequential, or punitive damages. Our total liability for any 12‑month period will not exceed the
              amounts you paid to us for the Service in that period (or USD $100 for free tiers).
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>13. Indemnity</Text>
            <Text style={styles.paragraph}>
              You will defend and indemnify us against claims arising from your data or your breach of these
              Terms.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>14. Termination</Text>
            <Text style={styles.paragraph}>
              You may stop using the Service at any time. We may suspend or terminate for breach, harm, or legal
              risk. Upon termination, your access ceases; we will delete or return your data per our Privacy
              Policy and retention schedule.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>15. Governing Law & Disputes</Text>
            <Text style={styles.paragraph}>
              These Terms are governed by applicable law; disputes will be resolved in the designated venue to
              the extent permitted by law. Class actions are waived where permitted.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>16. Changes</Text>
            <Text style={styles.paragraph}>
              We may update these Terms and will provide notice of material changes. Continued use after the
              effective date constitutes acceptance.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>17. Contact</Text>
            <Text style={styles.paragraph}>Contact: legal@everreach.app</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  backButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333333',
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333333',
    marginBottom: 8,
    marginLeft: 16,
  },
  contactInfo: {
    fontSize: 16,
    lineHeight: 24,
    color: '#007AFF',
    fontWeight: '500',
  },
  webLinkContainer: {
    marginBottom: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  webLink: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
});