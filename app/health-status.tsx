import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { HealthStatus } from '@/components/HealthStatus';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function HealthStatusScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppSettings();

  // Analytics tracking
  useAnalytics('HealthStatus');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Backend Health Status
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Real-time status of your Vercel backend deployment
          </Text>
        </View>

        <HealthStatus 
          showVersion={true}
          autoRefresh={true}
          refreshInterval={30000}
        />

        <View style={styles.infoSection}>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
            What this shows:
          </Text>
          <View style={styles.infoList}>
            <Text style={[styles.infoItem, { color: theme.colors.textSecondary }]}>
              • Backend API availability and response time
            </Text>
            <Text style={[styles.infoItem, { color: theme.colors.textSecondary }]}>
              • Server timestamp and deployment info
            </Text>
            <Text style={[styles.infoItem, { color: theme.colors.textSecondary }]}>
              • Git commit hash and branch information
            </Text>
            <Text style={[styles.infoItem, { color: theme.colors.textSecondary }]}>
              • Auto-refresh every 30 seconds
            </Text>
          </View>
        </View>

        <View style={styles.endpointSection}>
          <Text style={[styles.endpointTitle, { color: theme.colors.text }]}>
            API Endpoints:
          </Text>
          <View style={styles.endpointList}>
            <Text style={[styles.endpointItem, { color: theme.colors.textSecondary }]}>
              Health: /api/health
            </Text>
            <Text style={[styles.endpointItem, { color: theme.colors.textSecondary }]}>
              Version: /api/version
            </Text>
            <Text style={[styles.endpointItem, { color: theme.colors.textSecondary }]}>
              tRPC: /api/trpc
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 8,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    padding: 8,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoSection: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoList: {
    gap: 6,
  },
  infoItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  endpointSection: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  endpointTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  endpointList: {
    gap: 6,
  },
  endpointItem: {
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
});