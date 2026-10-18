/**
 * Settings Screen
 * Feature: IOS-NAV-005
 *
 * Main settings screen with:
 * - User profile information
 * - Links to profile and subscription management
 * - Logout functionality
 *
 * Acceptance Criteria:
 * - Shows user info
 * - Logout works
 * - Links to sub-screens
 *
 * CUSTOMIZATION GUIDE:
 * To adapt this screen for your app:
 * 1. Add/remove settings sections based on your app's needs
 * 2. Customize the navigation links to match your routes
 * 3. Add app-specific settings (notifications, preferences, etc.)
 * 4. Update styling to match your brand
 *
 * @module app/(tabs)/settings
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';

/**
 * Settings Item Component
 * Reusable component for settings menu items
 */
interface SettingsItemProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  icon?: string;
  destructive?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  title,
  subtitle,
  onPress,
  icon,
  destructive = false,
}) => (
  <TouchableOpacity
    style={styles.settingsItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.settingsItemContent}>
      {icon && <Text style={styles.settingsIcon}>{icon}</Text>}
      <View style={styles.settingsTextContainer}>
        <Text
          style={[
            styles.settingsTitle,
            destructive && styles.destructiveText,
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.settingsSubtitle}>{subtitle}</Text>
        )}
      </View>
      {!destructive && <Text style={styles.chevron}>›</Text>}
    </View>
  </TouchableOpacity>
);

/**
 * Settings Section Component
 * Groups related settings items
 */
interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

/**
 * Settings Screen Component
 *
 * Main settings screen with user profile, navigation to sub-screens,
 * and logout functionality.
 *
 * @example
 * ```tsx
 * // This screen is automatically rendered at the settings tab route
 * // Users can navigate here from the tab bar
 * ```
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  /**
   * Handle logout with confirmation
   * CUSTOMIZATION: Customize the confirmation message
   */
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              console.log('User logged out successfully');
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  /**
   * Navigate to profile screen
   * CUSTOMIZATION: Update the route if you renamed the profile screen
   */
  const handleProfilePress = () => {
    // CUSTOMIZATION: Replace with your profile route
    router.push('/profile');
    console.log('Navigate to profile');
  };

  /**
   * Navigate to subscription/paywall screen
   * CUSTOMIZATION: Update the route if you renamed the paywall screen
   */
  const handleSubscriptionPress = () => {
    // CUSTOMIZATION: Replace with your subscription route
    router.push('/paywall');
    console.log('Navigate to subscription');
  };

  /**
   * Loading state
   */
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <SettingsSection title="Account">
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {user?.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={styles.userEmail}>{user?.email || 'Not signed in'}</Text>
            </View>
          </View>

          <SettingsItem
            title="Edit Profile"
            subtitle="Update your name and photo"
            icon="👤"
            onPress={handleProfilePress}
          />
        </SettingsSection>

        {/* Subscription Section */}
        <SettingsSection title="Subscription">
          <SettingsItem
            title="Manage Subscription"
            subtitle="View and manage your plan"
            icon="💳"
            onPress={handleSubscriptionPress}
          />
        </SettingsSection>

        {/* App Section */}
        {/* CUSTOMIZATION: Add app-specific settings here */}
        <SettingsSection title="App">
          <SettingsItem
            title="Notifications"
            subtitle="Manage notification preferences"
            icon="🔔"
            onPress={() => console.log('Notifications pressed')}
          />
          <SettingsItem
            title="Privacy"
            subtitle="Privacy and data settings"
            icon="🔒"
            onPress={() => console.log('Privacy pressed')}
          />
        </SettingsSection>

        {/* Support Section */}
        <SettingsSection title="Support">
          <SettingsItem
            title="Help & Support"
            subtitle="Get help and contact us"
            icon="❓"
            onPress={() => console.log('Help pressed')}
          />
          <SettingsItem
            title="About"
            subtitle="App version and info"
            icon="ℹ️"
            onPress={() => console.log('About pressed')}
          />
        </SettingsSection>

        {/* Logout Section */}
        <View style={styles.section}>
          <SettingsItem
            title="Logout"
            icon="🚪"
            onPress={handleLogout}
            destructive
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Styles
 * CUSTOMIZATION: Update colors and spacing to match your brand
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666666',
  },
  settingsItem: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  settingsItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingsIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: 13,
    color: '#666666',
  },
  destructiveText: {
    color: '#FF3B30',
  },
  chevron: {
    fontSize: 20,
    color: '#C7C7CC',
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#999999',
  },
});
