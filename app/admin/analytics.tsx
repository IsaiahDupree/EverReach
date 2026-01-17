import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { useAnalyticsSummary } from '@/hooks/admin/useAnalyticsSummary';
import { AnalyticsCard } from '@/components/admin/AnalyticsCard';
import { WarmthDistributionChart } from '@/components/admin/WarmthDistributionChart';
import { Users, MessageCircle, Thermometer, Sparkles } from 'lucide-react-native';

/**
 * Analytics Dashboard Screen
 * Shows user's personal usage statistics
 */
export default function AnalyticsScreen() {
  const { theme } = useAppSettings();
  const colors = theme.colors;
  const { data, isLoading, error, refetch } = useAnalyticsSummary(30);

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading your analytics...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Failed to load analytics
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {error}
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No analytics data available
        </Text>
      </View>
    );
  }

  const totalAiUsage = 
    data.ai_usage.messages_generated +
    data.ai_usage.contacts_analyzed +
    data.ai_usage.screenshots_analyzed;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Your Analytics</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Last {data.period.days} days
        </Text>
      </View>

      {/* Key Metrics Grid */}
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <View style={styles.gridItem}>
            <AnalyticsCard
              title="Total Contacts"
              value={data.contacts.total}
              change={data.contacts.created_this_period > 0 ? `+${data.contacts.created_this_period} new` : undefined}
              icon={Users}
              iconColor="#3B82F6"
            />
          </View>
          <View style={styles.gridItem}>
            <AnalyticsCard
              title="Interactions"
              value={data.interactions.logged_this_period}
              icon={MessageCircle}
              iconColor="#10B981"
            />
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.gridItem}>
            <AnalyticsCard
              title="Avg Warmth"
              value={data.contacts.avg_warmth.toFixed(1)}
              icon={Thermometer}
              iconColor="#F59E0B"
            />
          </View>
          <View style={styles.gridItem}>
            <AnalyticsCard
              title="AI Usage"
              value={totalAiUsage}
              icon={Sparkles}
              iconColor="#8B5CF6"
            />
          </View>
        </View>
      </View>

      {/* Warmth Distribution */}
      <View style={styles.section}>
        <WarmthDistributionChart data={data.contacts.warmth_distribution} />
      </View>

      {/* Detailed Stats */}
      <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity Details</Text>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Messages Sent
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {data.interactions.messages_sent}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Total Interactions
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {data.interactions.total}
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Features</Text>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            AI Messages Generated
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {data.ai_usage.messages_generated}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Contacts Analyzed
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {data.ai_usage.contacts_analyzed}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Screenshots Analyzed
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {data.ai_usage.screenshots_analyzed}
          </Text>
        </View>
      </View>

      {/* Spacer */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  grid: {
    padding: 16,
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  detailsCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
