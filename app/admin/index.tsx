import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { Settings2, BarChart3, CreditCard, Users, Database, Flag, Wrench } from 'lucide-react-native';

/**
 * Admin Dashboard - Main Menu
 * Gateway to all admin/management features
 */
export default function AdminDashboard() {
  const router = useRouter();
  const { theme } = useAppSettings();
  const colors = theme.colors;

  const adminSections = [
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View your usage stats and insights',
      icon: BarChart3,
      color: '#3B82F6',
      route: '/admin/analytics',
    },
    {
      id: 'billing',
      title: 'Billing & Subscription',
      description: 'Manage your plan and usage limits',
      icon: CreditCard,
      color: '#10B981',
      route: '/admin/billing',
    },
    {
      id: 'organization',
      title: 'Organization',
      description: 'Manage organization settings',
      icon: Settings2,
      color: '#8B5CF6',
      route: '/admin/organization',
    },
    {
      id: 'team',
      title: 'Team Management',
      description: 'Invite and manage team members',
      icon: Users,
      color: '#F59E0B',
      route: '/admin/team',
      badge: 'Pro',
    },
    {
      id: 'data',
      title: 'Data Management',
      description: 'Export, backup, and cleanup data',
      icon: Database,
      color: '#06B6D4',
      route: '/admin/data',
    },
    {
      id: 'features',
      title: 'Feature Access',
      description: 'See enabled features and experiments',
      icon: Flag,
      color: '#EC4899',
      route: '/admin/features',
    },
    {
      id: 'debug',
      title: 'Debug & Support',
      description: 'Diagnostics and help',
      icon: Wrench,
      color: '#6B7280',
      route: '/admin/debug',
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Admin Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Manage your EverReach workspace
        </Text>
      </View>

      <View style={styles.sections}>
        {adminSections.map((section) => {
          const Icon = section.icon;
          
          return (
            <TouchableOpacity
              key={section.id}
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => router.push(section.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: section.color + '20' }]}>
                <Icon size={24} color={section.color} />
              </View>
              
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {section.title}
                  </Text>
                  {section.badge && (
                    <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>
                        {section.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                  {section.description}
                </Text>
              </View>

              <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  sections: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardDescription: {
    fontSize: 14,
  },
  arrow: {
    fontSize: 24,
    fontWeight: '300',
    marginLeft: 8,
  },
});
