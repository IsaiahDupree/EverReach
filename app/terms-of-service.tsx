import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Stack } from 'expo-router';

export default function TermsOfServiceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
          <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.paragraph}>
              By accessing and using this personal CRM application, you accept and agree to be bound by 
              the terms and provision of this agreement.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Use License</Text>
            <Text style={styles.paragraph}>
              Permission is granted to temporarily use this application for personal, non-commercial 
              transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </Text>
            <Text style={styles.bulletPoint}>• Modify or copy the materials</Text>
            <Text style={styles.bulletPoint}>• Use the materials for any commercial purpose</Text>
            <Text style={styles.bulletPoint}>• Attempt to reverse engineer any software</Text>
            <Text style={styles.bulletPoint}>• Remove any copyright or other proprietary notations</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Subscription and Payment</Text>
            <Text style={styles.paragraph}>
              Our service offers both free and paid subscription tiers:
            </Text>
            <Text style={styles.bulletPoint}>• Free trial period of 7 days for new users</Text>
            <Text style={styles.bulletPoint}>• Subscription fees are charged through your app store account</Text>
            <Text style={styles.bulletPoint}>• Subscriptions auto-renew unless cancelled</Text>
            <Text style={styles.bulletPoint}>• Refunds are subject to app store policies</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. User Data and Privacy</Text>
            <Text style={styles.paragraph}>
              Your privacy is important to us. By using our service:
            </Text>
            <Text style={styles.bulletPoint}>• Data is stored locally by default</Text>
            <Text style={styles.bulletPoint}>• Cloud sync is optional and can be disabled</Text>
            <Text style={styles.bulletPoint}>• You retain ownership of your data</Text>
            <Text style={styles.bulletPoint}>• You can export or delete your data at any time</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Prohibited Uses</Text>
            <Text style={styles.paragraph}>
              You may not use our service:
            </Text>
            <Text style={styles.bulletPoint}>• For any unlawful purpose or to solicit others to unlawful acts</Text>
            <Text style={styles.bulletPoint}>• To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</Text>
            <Text style={styles.bulletPoint}>• To infringe upon or violate our intellectual property rights or the intellectual property rights of others</Text>
            <Text style={styles.bulletPoint}>• To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Disclaimer</Text>
            <Text style={styles.paragraph}>
              The information on this application is provided on an &apos;as is&apos; basis. To the fullest extent 
              permitted by law, this Company excludes all representations, warranties, conditions and terms.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Limitations</Text>
            <Text style={styles.paragraph}>
              In no event shall the Company or its suppliers be liable for any damages (including, without 
              limitation, damages for loss of data or profit, or due to business interruption) arising out 
              of the use or inability to use the materials on this application.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Contact Information</Text>
            <Text style={styles.paragraph}>
              If you have any questions about these Terms of Service, please contact us at:
            </Text>
            <Text style={styles.contactInfo}>legal@yourcrm.com</Text>
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
});